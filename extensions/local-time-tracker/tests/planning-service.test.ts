import assert from "node:assert/strict";
import { createRequire, registerHooks } from "node:module";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("daily planning integrates with existing timers, logs and recoverable storage", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "local-time-tracker-planning-"));
  const items = new Map<string, unknown>();
  let failWrite: string | undefined;
  const api = {
    environment: { supportPath: directory },
    getPreferenceValues: () => ({ pomodoroEnabled: true }),
    LaunchType: { Background: "background" },
    launchCommand: async () => {},
    LocalStorage: {
      getItem: async (key: string) => items.get(key),
      setItem: async (key: string, value: unknown) => {
        if (key === failWrite) throw new Error("disk full");
        items.set(key, value);
      },
      removeItem: async (key: string) => {
        items.delete(key);
      },
      allItems: async () => Object.fromEntries(items),
    },
  };
  const globals = globalThis as typeof globalThis & { planningTestAPI?: typeof api };
  globals.planningTestAPI = api;
  const mockPath = join(directory, "raycast-api-mock.cjs");
  await writeFile(mockPath, "module.exports = globalThis.planningTestAPI;");
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      return specifier === "@raycast/api"
        ? { url: new URL(`file://${mockPath}`).href, shortCircuit: true }
        : nextResolve(specifier, context);
    },
  });
  try {
    const load = createRequire(join(process.cwd(), "tests/planning-service.test.ts"));
    const storage = load("../src/lib/storage.ts") as typeof import("../src/lib/storage");
    const service = load("../src/lib/planning-service.ts") as typeof import("../src/lib/planning-service");
    const timer = load("../src/lib/timer.ts") as typeof import("../src/lib/timer");
    const { getPomodoro } = load("../src/lib/reminder-service.ts") as typeof import("../src/lib/reminder-service");
    const { planContent, isPlanComplete, localDateKey } = load(
      "../src/lib/planning.ts",
    ) as typeof import("../src/lib/planning");
    const now = new Date().toISOString();
    const project = {
      id: "project",
      name: "Personal",
      type: "internal",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    await storage.saveProjects([project, { ...project, id: "other" }]);
    const date = localDateKey(new Date());
    let goal = await service.savePlanDraft({
      date,
      content: " Ship form \n- Fields\n- Validate\n- Send",
      projectId: project.id,
    });
    const first = { goalId: goal.id, taskId: goal.tasks[0].id };
    const second = { goalId: goal.id, taskId: goal.tasks[1].id };

    await t.test("existing project data stays readable and a single input creates the goal and subtasks", async () => {
      assert.deepEqual(await storage.getProjects(), [project, { ...project, id: "other" }]);
      assert.equal(goal.title, "Ship form");
      assert.deepEqual(
        goal.tasks.map((task) => task.title),
        ["Fields", "Validate", "Send"],
      );
      assert.equal((await storage.getPlans()).length, 1);
    });

    await t.test(
      "switching saves the unplanned timer, links the selected task and rejects stale stop/start actions",
      async () => {
        const old = await timer.startTimer(project.id, "Unplanned");
        const planned = await timer.startPlannedTimer(first, false, old.id);
        assert.deepEqual(planned.plan, first);
        assert.equal((await storage.getWorkLogs()).find((log) => log.id === old.id)?.plan, undefined);
        assert.equal((await timer.startPlannedTimer(first, false, planned.id)).id, planned.id);
        await assert.rejects(timer.stopTimer(old.id), /has changed/);
        await assert.rejects(timer.startPlannedTimer(second, false, old.id), /has changed/);
        assert.equal((await storage.getActiveTimer())?.id, planned.id);
      },
    );

    await t.test("completion saves the task log, stops tracking and keeps its identity across renaming", async () => {
      const running = (await storage.getActiveTimer())!;
      await timer.updateTimerStart(running.id, running.startedAt, new Date(Date.now() - 5 * 60000));
      await timer.completePlannedItem(first, true);
      assert.equal(await storage.getActiveTimer(), null);
      const saved = (await storage.getWorkLogs()).find((log) => log.id === running.id)!;
      assert.deepEqual(saved.plan, first);
      goal = (await storage.getPlan(goal.id))!;
      assert.ok(goal.tasks[0].completedAt);
      await assert.rejects(timer.startPlannedTimer(first), /Reopen/);
      const staleGoal = goal;
      await service.savePlanDraft({
        ...goal,
        expectedUpdatedAt: goal.updatedAt,
        content: [
          goal.title,
          ...goal.tasks.map((task) => (task.id === first.taskId ? "Pick fields" : task.title)),
        ].join("\n"),
      });
      goal = (await storage.getPlan(goal.id))!;
      assert.equal(goal.tasks[0].id, first.taskId);
      assert.equal(goal.tasks[0].title, "Pick fields");
      assert.deepEqual((await storage.getWorkLogs()).find((log) => log.id === running.id)?.plan, first);
      await assert.rejects(
        service.savePlanDraft({ ...staleGoal, expectedUpdatedAt: "stale", content: planContent(staleGoal) }),
        /changed/,
      );
      await timer.completePlannedItem(first, false);
    });

    await t.test("clock rollback preserves the timer, Pomodoro and completion state", async () => {
      const running = await timer.startPlannedTimer(first, true, null);
      const overlay = await getPomodoro(running);
      await storage.saveActiveTimer({ ...running, startedAt: new Date(Date.now() + 60000).toISOString() });
      await assert.rejects(timer.startPlannedTimer(second), /Clock changed/);
      await assert.rejects(timer.completePlannedItem(first, true), /Clock changed/);
      assert.equal((await storage.getPlan(goal.id))!.tasks[0].completedAt, undefined);
      assert.equal((await getPomodoro(running))?.intervalId, overlay?.intervalId);
      assert.equal((await storage.getActiveTimer())?.id, running.id);
      await storage.saveActiveTimer(running);
    });

    await t.test(
      "running tasks cannot be deleted or moved between projects; switching cleans up the old overlay",
      async () => {
        const running = (await storage.getActiveTimer())!;
        await assert.rejects(service.removePlannedItem(first), /Stop/);
        await assert.rejects(service.removePlannedItem({ goalId: goal.id }), /Stop/);
        goal = (await storage.getPlan(goal.id))!;
        await assert.rejects(
          service.savePlanDraft({
            ...goal,
            expectedUpdatedAt: goal.updatedAt,
            content: [goal.title, ...goal.tasks.slice(1).map((task) => task.title)].join("\n"),
          }),
          /Stop/,
        );
        await assert.rejects(
          service.savePlanDraft({
            ...goal,
            expectedUpdatedAt: goal.updatedAt,
            projectId: "other",
            content: planContent(goal),
          }),
          /Stop/,
        );
        const next = await timer.startPlannedTimer(second, false, running.id);
        assert.equal(await getPomodoro(next), null);
        assert.deepEqual((await storage.getWorkLogs()).find((log) => log.id === running.id)?.plan, first);
      },
    );

    await t.test("failed log writes never stop a timer or mark a task complete", async () => {
      const running = (await storage.getActiveTimer())!;
      failWrite = `workLog:${running.id}`;
      await assert.rejects(timer.completePlannedItem(second, true), /disk full/);
      assert.equal((await storage.getActiveTimer())?.id, running.id);
      assert.equal((await storage.getPlan(goal.id))!.tasks[1].completedAt, undefined);
      failWrite = undefined;
      await timer.completePlannedItem({ goalId: goal.id }, true);
      assert.ok(isPlanComplete((await storage.getPlan(goal.id))!));
      assert.equal(await storage.getActiveTimer(), null);
    });

    await t.test(
      "a leaf goal is trackable, unrelated completion leaves it running, and deletion preserves logs",
      async () => {
        const leaf = await service.savePlanDraft({ date, content: "Read", projectId: project.id });
        const running = await timer.startPlannedTimer({ goalId: leaf.id });
        await timer.completePlannedItem({ goalId: goal.id }, false);
        assert.equal((await storage.getActiveTimer())?.id, running.id);
        await storage.saveProjects([
          { ...project, isActive: false },
          { ...project, id: "other" },
        ]);
        await assert.rejects(timer.startPlannedTimer(first), /Enable/);
        assert.equal((await storage.getActiveTimer())?.id, running.id);
        await timer.completePlannedItem({ goalId: leaf.id }, true);
        const count = (await storage.getWorkLogs()).length;
        await service.removePlannedItem({ goalId: leaf.id });
        assert.equal(await storage.getPlan(leaf.id), undefined);
        assert.equal((await storage.getWorkLogs()).length, count);
        assert.deepEqual((await storage.getWorkLogs()).find((log) => log.id === running.id)?.plan, { goalId: leaf.id });
        await storage.saveProjects([project, { ...project, id: "other" }]);
      },
    );

    await t.test("failed completion writes can be retried without duplicating the saved work log", async () => {
      const running = await timer.startPlannedTimer(first);
      failWrite = `dailyGoal:${goal.id}`;
      await assert.rejects(timer.completePlannedItem(first, true), /disk full/);
      assert.equal(await storage.getActiveTimer(), null);
      assert.equal((await storage.getWorkLogs()).filter((log) => log.id === running.id).length, 1);
      failWrite = undefined;
      await timer.completePlannedItem(first, true);
      assert.ok((await storage.getPlan(goal.id))!.tasks[0].completedAt);
      assert.equal((await storage.getWorkLogs()).filter((log) => log.id === running.id).length, 1);
    });

    await t.test("standard plan snapshots use existing timer, plan and work-log services", async () => {
      const { readDailyPlan } = load("../src/lib/plan-state.ts") as typeof import("../src/lib/plan-state");
      await timer.completePlannedItem(first, false, date);
      await timer.startPlannedTimer(first, false, null, date);
      const active = (await storage.getActiveTimer())!;
      assert.deepEqual(active.plan, first);
      assert.equal((await readDailyPlan(date)).active?.id, active.id);
      await timer.completePlannedItem(first, true, date);
      assert.equal(await storage.getActiveTimer(), null);
      assert.deepEqual((await storage.getWorkLogs()).find((entry) => entry.id === active.id)?.plan, first);
      assert.ok((await readDailyPlan(date)).goals[0].tasks[0].completedAt);
    });

    await t.test(
      "reordering persists whole goals and siblings without changing running work, completion or edited content",
      async () => {
        const alpha = await service.savePlanDraft({ date, content: "Alpha\nA\nB\nC", projectId: project.id });
        const beta = await service.savePlanDraft({ date, content: "Beta", projectId: project.id });
        const tomorrow = localDateKey(new Date(Date.now() + 86400000));
        const otherDay = await service.savePlanDraft({ date: tomorrow, content: "Another day", projectId: project.id });
        const [a, b, c] = alpha.tasks;
        await timer.completePlannedItem({ goalId: alpha.id, taskId: c.id }, true);
        const running = await timer.startPlannedTimer({ goalId: alpha.id, taskId: a.id }, true, null);
        const overlay = await getPomodoro(running);
        const logs = await storage.getWorkLogs();
        const completedAt = (await storage.getPlan(alpha.id))!.tasks[2].completedAt;
        const move = { date, goalId: alpha.id, taskId: a.id, targetId: c.id, placement: "after" as const };
        await service.reorderPlannedItem(move);
        let saved = (await storage.getPlan(alpha.id))!;
        assert.deepEqual(
          saved.tasks.map((task) => task.id),
          [b.id, c.id, a.id],
        );
        assert.equal(saved.tasks.find((task) => task.id === c.id)!.completedAt, completedAt);
        // A stale relative move must retain a concurrently appended/renamed task.
        saved = await service.savePlanDraft({
          ...saved,
          expectedUpdatedAt: saved.updatedAt,
          content: "Alpha revised\nB\nC\nA\nD",
        });
        await service.reorderPlannedItem({ ...move, targetId: b.id, placement: "before" });
        saved = (await storage.getPlan(alpha.id))!;
        assert.equal(saved.title, "Alpha revised");
        assert.deepEqual(
          saved.tasks.map((task) => task.title),
          ["A", "B", "C", "D"],
        );
        await service.reorderPlannedItem({ date, goalId: beta.id, targetId: alpha.id, placement: "before" });
        let parents = (await storage.getPlans()).filter((item) => item.date === date);
        assert.equal(
          parents.findIndex((item) => item.id === beta.id) + 1,
          parents.findIndex((item) => item.id === alpha.id),
        );
        assert.deepEqual((await storage.getPlan(alpha.id))!.tasks, saved.tasks);
        assert.deepEqual(await storage.getPlan(otherDay.id), JSON.parse(JSON.stringify(otherDay)));
        // Editing and adding a goal must preserve custom parent order and append new goals.
        await service.savePlanDraft({
          ...saved,
          expectedUpdatedAt: saved.updatedAt,
          content: "Alpha edited again\nA\nB\nC\nD",
        });
        const added = await service.savePlanDraft({ date, content: "New last goal", projectId: project.id });
        parents = (await storage.getPlans()).filter((item) => item.date === date);
        assert.equal(parents.at(-1)!.id, added.id);
        assert.ok(parents.findIndex((item) => item.id === beta.id) < parents.findIndex((item) => item.id === alpha.id));
        await assert.rejects(service.reorderPlannedItem({ ...move, targetId: beta.id }), /same group/);
        await assert.rejects(
          service.reorderPlannedItem({ date, goalId: beta.id, targetId: otherDay.id, placement: "before" }),
          /same group/,
        );
        await assert.rejects(service.reorderPlannedItem({ ...move, date: tomorrow }), /changed/);
        const before = await storage.getPlans();
        failWrite = `dailyGoalOrder:${date}`;
        await assert.rejects(
          service.reorderPlannedItem({ date, goalId: alpha.id, targetId: beta.id, placement: "before" }),
          /disk full/,
        );
        failWrite = `dailyGoal:${alpha.id}`;
        await assert.rejects(service.reorderPlannedItem({ ...move, targetId: c.id }), /disk full/);
        failWrite = undefined;
        assert.deepEqual(await storage.getPlans(), before);
        assert.deepEqual(await storage.getActiveTimer(), running);
        assert.deepEqual(await getPomodoro(running), overlay);
        assert.deepEqual(await storage.getWorkLogs(), logs);
        // Deleted identifiers in an order list are harmless; corrupt order data is surfaced.
        await service.removePlannedItem({ goalId: added.id });
        assert.equal(
          (await storage.getPlans()).some((item) => item.id === added.id),
          false,
        );
        const storedOrder = items.get(`dailyGoalOrder:${date}`);
        items.set(`dailyGoalOrder:${date}`, '["duplicate","duplicate"]');
        await assert.rejects(storage.getPlans(), /order is invalid/);
        assert.equal(items.get(`dailyGoalOrder:${date}`), '["duplicate","duplicate"]');
        items.set(`dailyGoalOrder:${date}`, storedOrder);
        await timer.stopTimer(running.id);
      },
    );

    await t.test(
      "carry one unfinished task, then its siblings, without changing historical time or a running timer",
      async () => {
        const past = localDateKey(new Date(Date.now() - 86400000));
        let shared = await service.savePlanDraft({
          date: past,
          content: "Carry goal\nDone\nCarry\nLater",
          projectId: project.id,
        });
        const [done, carry, later] = shared.tasks;
        const reference = { goalId: shared.id, taskId: carry.id };
        await timer.completePlannedItem({ goalId: shared.id, taskId: done.id }, true, past);
        shared = (await storage.getPlan(shared.id))!;
        const historical = {
          id: "carry-history",
          projectId: project.id,
          description: "Carry",
          plan: reference,
          startedAt: new Date(`${past}T10:00:00`).toISOString(),
          endedAt: new Date(`${past}T10:20:00`).toISOString(),
          createdAt: now,
          updatedAt: now,
        };
        items.set(`workLog:${historical.id}`, JSON.stringify(historical));
        const running = await timer.startPlannedTimer(reference, true, null, past);
        const overlay = await getPomodoro(running);
        const logs = await storage.getWorkLogs();
        const { readDailyPlan } = load("../src/lib/plan-state.ts") as typeof import("../src/lib/plan-state");
        const request = { date: past, ...reference, expectedUpdatedAt: shared.updatedAt };
        const result = await service.movePlannedItemToToday(request);
        assert.deepEqual(result, { date, focus: reference });
        assert.deepEqual(
          (await storage.getPlans(past)).find((item) => item.id === shared.id)!.tasks.map((task) => task.id),
          [done.id, later.id],
        );
        assert.deepEqual(
          (await storage.getPlans(date)).find((item) => item.id === shared.id)!.tasks.map((task) => task.id),
          [carry.id],
        );
        await assert.rejects(service.movePlannedItemToToday(request), /changed/);
        await assert.rejects(timer.startPlannedTimer(reference, false, running.id, past), /no longer exists/);
        assert.equal((await readDailyPlan(past)).goals.find((item) => item.id === shared.id)!.seconds, 1200);
        const beforeRead = Date.now();
        const todaySeconds = (await readDailyPlan(date)).goals.find((item) => item.id === shared.id)!.tasks[0].seconds;
        const elapsedAt = (instant: number) => Math.floor((instant - Date.parse(running.startedAt)) / 1000);
        assert.ok(todaySeconds >= elapsedAt(beforeRead) && todaySeconds <= elapsedAt(Date.now()));
        // Saving the projected editor must preserve tasks that stayed on the earlier day.
        shared = (await storage.getPlan(shared.id))!;
        shared = await service.savePlanDraft({
          ...shared,
          date,
          expectedUpdatedAt: shared.updatedAt,
          content: "Carry renamed\nCarry renamed task",
        });
        shared = await service.savePlanDraft({
          ...shared,
          date,
          expectedUpdatedAt: shared.updatedAt,
          content: "Carry renamed\nCarry renamed task\nAdded today",
        });
        assert.ok(shared.tasks.find((task) => task.id === done.id)!.completedAt);
        assert.equal(shared.tasks.find((task) => task.id === later.id)!.title, "Later");
        assert.equal(shared.tasks.find((task) => task.id === carry.id)!.title, "Carry renamed task");
        await assert.rejects(
          service.savePlanDraft({ ...shared, date, expectedUpdatedAt: shared.updatedAt, content: "Only a goal" }),
          /other dates/,
        );
        const beforeFailure = await storage.getPlan(shared.id);
        failWrite = `dailyGoal:${shared.id}`;
        await assert.rejects(
          service.movePlannedItemToToday({ goalId: shared.id, date: past, expectedUpdatedAt: shared.updatedAt }),
          /disk full/,
        );
        failWrite = undefined;
        assert.deepEqual(await storage.getPlan(shared.id), beforeFailure);
        await assert.rejects(
          service.movePlannedItemToToday({
            goalId: shared.id,
            taskId: done.id,
            date: past,
            expectedUpdatedAt: shared.updatedAt,
          }),
          /Only unfinished/,
        );
        await assert.rejects(
          service.movePlannedItemToToday({ ...reference, date, expectedUpdatedAt: shared.updatedAt }),
          /past date/,
        );
        // The task-level service also preserves siblings on other dates.
        await service.movePlannedItemToToday({
          goalId: shared.id,
          taskId: later.id,
          date: past,
          expectedUpdatedAt: shared.updatedAt,
        });
        const oldView = (await readDailyPlan(past)).goals.find((item) => item.id === shared.id)!;
        assert.deepEqual(
          oldView.tasks.map((task) => task.id),
          [done.id],
        );
        assert.ok(oldView.complete);
        const todayView = (await storage.getPlans(date)).find((item) => item.id === shared.id)!;
        assert.equal(todayView.tasks.length, 3);
        assert.equal(
          todayView.tasks.some((task) => task.id === done.id),
          false,
        );
        // Completion, reordering, and deletion are scoped to the displayed day.
        await timer.completePlannedItem({ goalId: shared.id }, false, past);
        await timer.completePlannedItem({ goalId: shared.id }, true, past);
        assert.ok((await storage.getPlan(shared.id))!.tasks.find((task) => task.id === done.id)!.completedAt);
        assert.equal(
          (await storage.getPlan(shared.id))!.tasks.find((task) => task.id === carry.id)!.completedAt,
          undefined,
        );
        await service.reorderPlannedItem({
          date,
          goalId: shared.id,
          taskId: carry.id,
          targetId: later.id,
          placement: "after",
        });
        assert.ok((await storage.getPlan(shared.id))!.tasks.some((task) => task.id === done.id));
        await service.reorderPlannedItem({ date, goalId: shared.id, targetId: goal.id, placement: "before" });
        const ordered = (await readDailyPlan(date)).goals.map((item) => item.id);
        assert.ok(ordered.indexOf(shared.id) < ordered.indexOf(goal.id));
        await service.removePlannedItem({ goalId: shared.id }, past);
        assert.equal(
          (await storage.getPlans(past)).some((item) => item.id === shared.id),
          false,
        );
        assert.equal((await storage.getPlans(date)).find((item) => item.id === shared.id)!.tasks.length, 3);
        assert.ok((await readDailyPlan(date)).dates.includes(past));
        assert.deepEqual(await storage.getActiveTimer(), running);
        assert.deepEqual(await getPomodoro(running), overlay);
        assert.deepEqual(await storage.getWorkLogs(), logs);
        await timer.stopTimer(running.id);
        shared = (await storage.getPlan(shared.id))!;
        shared = await service.savePlanDraft({
          ...shared,
          date,
          expectedUpdatedAt: shared.updatedAt,
          content: "Now a standalone goal",
        });
        assert.equal(shared.date, date);
        assert.equal(shared.tasks.length, 0);
        assert.ok((await readDailyPlan(date)).goals.some((item) => item.id === shared.id));
      },
    );

    await t.test("moving an incomplete parent carries every child with completion and order intact", async () => {
      const past = localDateKey(new Date(Date.now() - 86400000));
      const older = localDateKey(new Date(Date.now() - 2 * 86400000));
      let parent = await service.savePlanDraft({
        date: past,
        content: "Whole workflow\nFirst done\nStill pending\nLast done",
        projectId: project.id,
      });
      await timer.completePlannedItem({ goalId: parent.id, taskId: parent.tasks[0].id }, true, past);
      await timer.completePlannedItem({ goalId: parent.id, taskId: parent.tasks[2].id }, true, past);
      parent = (await storage.getPlan(parent.id))!;
      const sourceTasks = parent.tasks;
      const otherDayTask = { ...sourceTasks[0], id: "other-day-child", date: older };
      await storage.savePlan({ ...parent, tasks: [...sourceTasks, otherDayTask] });
      const historical = {
        id: "whole-plan-history",
        projectId: project.id,
        description: sourceTasks[0].title,
        plan: { goalId: parent.id, taskId: sourceTasks[0].id },
        startedAt: new Date(`${past}T10:00:00`).toISOString(),
        endedAt: new Date(`${past}T10:20:00`).toISOString(),
        createdAt: now,
        updatedAt: now,
      };
      items.set(`workLog:${historical.id}`, JSON.stringify(historical));
      const logs = await storage.getWorkLogs();
      const { createReport } = load("../src/lib/reports.ts") as typeof import("../src/lib/reports");
      const { readDailyPlan } = load("../src/lib/plan-state.ts") as typeof import("../src/lib/plan-state");
      const projects = await storage.getProjects();
      const reportDate = new Date(`${past}T12:00:00`);
      const report = createReport("today", logs, projects, null, reportDate);
      const request = { goalId: parent.id, date: past, expectedUpdatedAt: parent.updatedAt };
      const result = await service.movePlannedItemToToday(request);
      assert.deepEqual(result, { date, focus: { goalId: parent.id } });
      assert.equal(
        (await storage.getPlans(past)).some((item) => item.id === parent.id),
        false,
      );
      const saved = (await storage.getPlan(parent.id))!;
      assert.deepEqual(saved.tasks, [...sourceTasks.map((task) => ({ ...task, date })), otherDayTask]);
      const todayPlan = (await readDailyPlan(date)).goals.find((item) => item.id === parent.id)!;
      assert.equal(todayPlan.complete, false);
      assert.equal(todayPlan.seconds, 0);
      assert.deepEqual(
        todayPlan.tasks.map((task) => task.seconds),
        [0, 0, 0],
      );
      assert.deepEqual((await storage.getPlans(older)).find((item) => item.id === parent.id)!.tasks, [otherDayTask]);
      assert.ok((await readDailyPlan(date)).dates.includes(past));
      assert.deepEqual(await storage.getWorkLogs(), logs);
      assert.deepEqual(createReport("today", await storage.getWorkLogs(), projects, null, reportDate), report);
      await assert.rejects(service.movePlannedItemToToday(request), /changed/);

      const completeParent = await service.savePlanDraft({
        date: past,
        content: "Already finished\nDone",
        projectId: project.id,
      });
      await timer.completePlannedItem({ goalId: completeParent.id }, true, past);
      const completed = (await storage.getPlan(completeParent.id))!;
      await assert.rejects(
        service.movePlannedItemToToday({ goalId: completed.id, date: past, expectedUpdatedAt: completed.updatedAt }),
        /Only unfinished/,
      );
      assert.deepEqual(await storage.getPlan(completed.id), completed);
    });

    await t.test(
      "a standalone goal keeps its identity and past date when moved, and concurrent requests cannot duplicate it",
      async () => {
        const past = localDateKey(new Date(Date.now() - 2 * 86400000));
        const leaf = await service.savePlanDraft({ date: past, content: "Carry a leaf", projectId: project.id });
        const move = { goalId: leaf.id, date: past, expectedUpdatedAt: leaf.updatedAt };
        const results = await Promise.allSettled([
          service.movePlannedItemToToday(move),
          service.movePlannedItemToToday(move),
        ]);
        assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
        assert.equal(results.filter((item) => item.status === "rejected").length, 1);
        const saved = (await storage.getPlan(leaf.id))!;
        assert.equal(saved.date, date);
        assert.deepEqual(saved.previousDates, [past]);
        assert.equal(saved.id, leaf.id);
        assert.equal((await storage.getPlans(date)).filter((item) => item.id === leaf.id).length, 1);
        assert.equal(
          (await storage.getPlans(past)).some((item) => item.id === leaf.id),
          false,
        );
        const { readDailyPlan } = load("../src/lib/plan-state.ts") as typeof import("../src/lib/plan-state");
        assert.ok((await readDailyPlan(date)).dates.includes(past));
        await service.removePlannedItem({ goalId: saved.id }, date);
      },
    );

    await t.test("corrupt plan data is reported without overwriting it or older logs", async () => {
      const count = (await storage.getWorkLogs()).length;
      items.set("dailyGoal:broken", "{bad json");
      await assert.rejects(storage.getPlans(), /Could not parse/);
      assert.equal(items.get("dailyGoal:broken"), "{bad json");
      assert.equal((await storage.getWorkLogs()).length, count);
      const running = await timer.startTimer(project.id, "Regular work with unavailable plans");
      assert.equal((await timer.stopTimer(running.id)).status, "stopped");
      assert.equal((await storage.getWorkLogs()).length, count + 1);
      items.delete("dailyGoal:broken");
    });

    await t.test("a running standalone plan cannot gain subtasks until its timer stops", async () => {
      const saved = await service.savePlanDraft({ date, content: "Running standalone", projectId: project.id });
      const before = (await storage.getPlan(saved.id))!;
      const running = await timer.startPlannedTimer({ goalId: saved.id }, true, null, date);
      const overlay = await getPomodoro(running);
      const logs = await storage.getWorkLogs();
      try {
        await assert.rejects(
          service.savePlanDraft({
            ...before,
            expectedUpdatedAt: before.updatedAt,
            content: "Running standalone\nNew child",
          }),
          /Stop.*before adding subtasks/,
        );
        assert.deepEqual(await storage.getPlan(saved.id), before);
        assert.deepEqual(await storage.getActiveTimer(), running);
        assert.deepEqual(await getPomodoro(running), overlay);
        assert.deepEqual(await storage.getWorkLogs(), logs);
      } finally {
        await timer.stopTimer(running.id);
      }
      const withChildren = await service.savePlanDraft({
        ...before,
        expectedUpdatedAt: before.updatedAt,
        content: "Running standalone\nNew child",
      });
      assert.equal(withChildren.tasks.length, 1);
    });

    await t.test(
      "failed Pomodoro setup preserves the previous log and allows restarting the planned task",
      async () => {
        const plan = await service.savePlanDraft({ date, content: "Pomodoro setup\nWork", projectId: project.id });
        const reference = { goalId: plan.id, taskId: plan.tasks[0].id };
        const previous = await timer.startTimer(project.id, "Before switching", true);
        try {
          failWrite = "pomodoroState";
          await assert.rejects(timer.startPlannedTimer(reference, true, previous.id, date), /disk full/);
          assert.equal(await storage.getActiveTimer(), null);
          assert.equal(await getPomodoro(previous), null);
          assert.equal((await storage.getWorkLogs()).filter((log) => log.id === previous.id).length, 1);
          assert.equal((await storage.getPlan(plan.id))!.tasks[0].completedAt, undefined);
        } finally {
          failWrite = undefined;
        }
        const retried = await timer.startPlannedTimer(reference, true, null, date);
        assert.deepEqual(retried.plan, reference);
        assert.ok(await getPomodoro(retried));
        await timer.stopTimer(retried.id);
      },
    );

    await t.test("stale deletion cannot remove newly added subtasks or alter recorded work", async () => {
      const opened = await service.savePlanDraft({ date, content: "Delete guard\nFirst", projectId: project.id });
      const changed = await service.savePlanDraft({
        ...opened,
        expectedUpdatedAt: opened.updatedAt,
        content: "Delete guard\nFirst\nAdded after opening",
      });
      const before = await storage.getPlan(changed.id);
      const logs = await storage.getWorkLogs();
      const active = await storage.getActiveTimer();
      await assert.rejects(service.removePlannedItem({ goalId: opened.id }, date, opened.updatedAt), /changed.*Reopen/);
      assert.deepEqual(await storage.getPlan(opened.id), before);
      assert.deepEqual(await storage.getWorkLogs(), logs);
      assert.deepEqual(await storage.getActiveTimer(), active);
      await service.removePlannedItem({ goalId: changed.id }, date, changed.updatedAt);
      assert.equal(await storage.getPlan(changed.id), undefined);
    });

    await t.test("every plan mutation invalidates stale editors with a frozen or backwards clock", async (context) => {
      const instant = Date.now();
      context.mock.timers.enable({ apis: ["Date"], now: instant });
      let saved = await service.savePlanDraft({ date, content: "Revision\nA\nB", projectId: project.id });
      const stale = { ...saved, expectedUpdatedAt: saved.updatedAt, content: "Stale overwrite\nA\nB" };
      async function assertAdvanced(operation: () => Promise<unknown>) {
        const previous = saved.updatedAt;
        await operation();
        saved = (await storage.getPlan(saved.id))!;
        assert.ok(saved.updatedAt > previous, `${saved.updatedAt} must follow ${previous}`);
        await assert.rejects(service.savePlanDraft(stale), /changed/);
      }
      await assertAdvanced(() =>
        service.savePlanDraft({ ...saved, expectedUpdatedAt: saved.updatedAt, content: "Revision edited\nA\nB" }),
      );
      context.mock.timers.setTime(instant - 60000);
      await assertAdvanced(() =>
        timer.completePlannedItem({ goalId: saved.id, taskId: saved.tasks[0].id }, true, date),
      );
      await assertAdvanced(() =>
        service.reorderPlannedItem({
          date,
          goalId: saved.id,
          taskId: saved.tasks[0].id,
          targetId: saved.tasks[1].id,
          placement: "after",
        }),
      );
      await assertAdvanced(() => service.removePlannedItem({ goalId: saved.id, taskId: saved.tasks[0].id }, date));
    });

    await t.test("one import carries only the last nonempty day's incomplete plans and retries safely", async () => {
      const previousItems = new Map(items);
      items.clear();
      try {
        await storage.saveProjects([project]);
        const day = (offset: number) => {
          const instant = new Date();
          instant.setDate(instant.getDate() + offset);
          return localDateKey(instant);
        };
        const sourceDate = day(-3);
        const draft = async (date: string, content: string) => {
          const saved = await service.savePlanDraft({ date, content, projectId: project.id });
          return (await storage.getPlan(saved.id))!;
        };
        const current = await draft(date, "Already today");
        const beforeEmptyImport = new Map(items);
        assert.deepEqual(await service.importLatestPlansToToday(), { date, count: 0 });
        assert.deepEqual(items, beforeEmptyImport);
        const older = await draft(day(-5), "Older unfinished plan");
        const leaf = await draft(sourceDate, "Unfinished standalone");
        let parent = await draft(sourceDate, "Workflow\nFinished step\nPending step");
        await timer.completePlannedItem({ goalId: parent.id, taskId: parent.tasks[0].id }, true, sourceDate);
        parent = (await storage.getPlan(parent.id))!;
        const finished = await draft(sourceDate, "Fully complete\nDone");
        await timer.completePlannedItem({ goalId: finished.id }, true, sourceDate);
        await storage.savePlanOrder(sourceDate, [parent.id, leaf.id, finished.id]);
        const future = await draft(day(1), "Future plan");
        await storage.savePlan({ ...future, previousDates: [day(-1)] });
        const historical = {
          id: "latest-import-history",
          projectId: project.id,
          description: "Finished step",
          plan: { goalId: parent.id, taskId: parent.tasks[0].id },
          startedAt: new Date(`${sourceDate}T10:00:00`).toISOString(),
          endedAt: new Date(`${sourceDate}T10:20:00`).toISOString(),
          createdAt: now,
          updatedAt: now,
        };
        items.set(`workLog:${historical.id}`, JSON.stringify(historical));
        const logs = await storage.getWorkLogs();
        const running = await timer.startPlannedTimer({ goalId: current.id }, true);
        const pomodoro = await getPomodoro(running);
        const { readDailyPlan } = load("../src/lib/plan-state.ts") as typeof import("../src/lib/plan-state");
        const { createReport } = load("../src/lib/reports.ts") as typeof import("../src/lib/reports");
        const reportDate = new Date(`${sourceDate}T12:00:00`);
        const report = createReport("today", logs, [project], null, reportDate);
        assert.equal((await readDailyPlan(date)).previousPlanDate, sourceDate);

        const results = await Promise.allSettled([
          service.importLatestPlansToToday(sourceDate),
          service.importLatestPlansToToday(sourceDate),
        ]);
        assert.equal(
          results.reduce((sum, result) => sum + (result.status === "fulfilled" ? result.value.count : 0), 0),
          2,
        );
        assert.deepEqual(
          (await storage.getPlans(date)).map((goal) => goal.id),
          [current.id, parent.id, leaf.id],
        );
        assert.deepEqual(
          (await storage.getPlan(parent.id))!.tasks,
          parent.tasks.map((task) => ({ ...task, date })),
        );
        assert.deepEqual(
          (await storage.getPlans(sourceDate)).map((goal) => goal.id),
          [finished.id],
        );
        assert.deepEqual(await storage.getPlan(older.id), older);
        assert.equal((await storage.getPlan(future.id))!.date, day(1));
        const todayParent = (await readDailyPlan(date)).goals.find((goal) => goal.id === parent.id)!;
        assert.equal(todayParent.seconds, 0);
        assert.deepEqual(
          todayParent.tasks.map((task) => task.seconds),
          [0, 0],
        );
        assert.deepEqual(await storage.getWorkLogs(), logs);
        assert.deepEqual(createReport("today", await storage.getWorkLogs(), [project], null, reportDate), report);
        assert.deepEqual(await storage.getActiveTimer(), running);
        assert.deepEqual(await getPomodoro(running), pomodoro);
        // The latest day is now fully complete: do not silently reach back to older work.
        assert.deepEqual(await service.importLatestPlansToToday(sourceDate), { date, count: 0 });
        await assert.rejects(service.importLatestPlansToToday(older.date), /latest plan date has changed/);

        const firstRetry = await draft(day(-1), "Retry first");
        const secondRetry = await draft(day(-1), "Retry second\nA\nB");
        await storage.savePlanOrder(day(-1), [firstRetry.id, secondRetry.id]);
        failWrite = `dailyGoalOrder:${date}`;
        await assert.rejects(service.importLatestPlansToToday(day(-1)), /disk full/);
        assert.deepEqual(await storage.getPlan(firstRetry.id), firstRetry);
        failWrite = `dailyGoal:${secondRetry.id}`;
        await assert.rejects(service.importLatestPlansToToday(day(-1)), /1 plan imported.*Retry.*disk full/);
        failWrite = undefined;
        assert.equal((await storage.getPlan(firstRetry.id))!.date, date);
        assert.deepEqual(await storage.getPlan(secondRetry.id), secondRetry);
        assert.deepEqual(await service.importLatestPlansToToday(day(-1)), { date, count: 1 });
        const todayIds = (await storage.getPlans(date)).map((goal) => goal.id);
        assert.deepEqual(todayIds, [current.id, parent.id, leaf.id, firstRetry.id, secondRetry.id]);
        assert.equal(new Set(todayIds).size, todayIds.length);
        await assert.rejects(service.importLatestPlansToToday(day(-1)), /latest plan date has changed/);
        assert.deepEqual(await storage.getWorkLogs(), logs);
        assert.deepEqual(await storage.getActiveTimer(), running);
        assert.deepEqual(await getPomodoro(running), pomodoro);
      } finally {
        failWrite = undefined;
        items.clear();
        previousItems.forEach((value, key) => items.set(key, value));
      }
    });
  } finally {
    hooks.deregister();
    delete globals.planningTestAPI;
    await rm(directory, { recursive: true, force: true });
  }
});
