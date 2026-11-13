import { queryRocks } from "../api/ninety";
import { getCurrentUserId } from "../lib/me";
import { NinetyUrls } from "../lib/urls";

type Input = {
  /** Team Id from get-teams. Omit to get the user's own Rocks. */
  teamId?: string;
  /** Which quarter: Current (default), Next, Later, Future or all. */
  futureScope?: "Current" | "Next" | "Later" | "Future" | "all";
};

export default async function tool({ teamId, futureScope = "Current" }: Input) {
  const rocks = teamId
    ? await queryRocks({ teamId, futureScope })
    : await queryRocks({ userId: await getCurrentUserId(), futureScope });
  return rocks.map((rock) => ({
    id: rock._id,
    title: rock.title,
    description: rock.description,
    status: rock.statusCode,
    dueDate: rock.dueDate,
    quarter: rock.quarter,
    ownerUserId: rock.userId,
    teamId: rock.teamId,
    url: NinetyUrls.rock(rock),
    milestones: rock.milestones
      ?.filter((m) => !m.isDeleted)
      .map((m) => ({ id: m._id, title: m.title, dueDate: m.dueDate, done: m.isDone })),
  }));
}
