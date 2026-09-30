import { Action, ActionPanel, Clipboard, Form, Icon, showHUD, popToRoot, closeMainWindow } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { CraftEnvironmentForm } from "./components/CraftCommandState";
import { APPEND_POSITIONS } from "./constants";
import useCraftCommandContext from "./hooks/useCraftCommandContext";
import { resolveAddToDailyNoteAction } from "./lib/addToDailyNote";
import { buildDailyNoteOpenUrl, findDailyNoteBlockId } from "./lib/dailyNotes";
import { getDailyNotePreferences } from "./preferences";
import { formatTime } from "./utils/dateTimeFormatter";

interface FormValues {
  content: string;
  spaceId: string;
}

const formatContent = (content: string, preferences: Preferences.AddToDailyNote): string => {
  let finalContent = content;

  if (preferences.addTimestamp) {
    const now = new Date();
    const timeString = formatTime(now, preferences.timeFormat);
    finalContent = `**${timeString}**${preferences.contentPrefix}${finalContent}`;
  } else {
    finalContent = `${preferences.contentPrefix}${finalContent}`;
  }

  return `${finalContent}${preferences.contentSuffix}`;
};

export default function AddToDailyNote() {
  const command = useCraftCommandContext({ includeDatabases: true });
  const config = command.config.config;
  const preferences = getDailyNotePreferences();

  const [formValues, setFormValues] = useState<FormValues>({
    content: "",
    spaceId: "",
  });

  useEffect(() => {
    if (config?.primarySpace && !formValues.spaceId) {
      setFormValues((previousState) => ({
        ...previousState,
        spaceId: config.primarySpace?.spaceID || "",
      }));
    }
  }, [config?.primarySpace, formValues.spaceId]);

  const todayKey = new Date().toDateString();

  const dailyNoteBlockId = useMemo(() => {
    if (!formValues.spaceId) {
      return null;
    }

    return findDailyNoteBlockId(command.db.databases, formValues.spaceId, new Date());
  }, [command.db.databases, formValues.spaceId, todayKey]);

  const actionType = resolveAddToDailyNoteAction({
    content: formValues.content,
    spaceId: formValues.spaceId,
    dailyNoteBlockId,
  });

  const handleSubmit = (submitActionType = actionType) => {
    if (!formValues.content.trim()) {
      showHUD("❌ Content is required");
      return;
    }

    if (!formValues.spaceId) {
      showHUD("❌ Space is required");
      return;
    }

    if (!command.environment.environment || command.environment.environment.status !== "ready") {
      showHUD("❌ Craft app is not installed");
      return;
    }

    const finalContent = formatContent(formValues.content, preferences);
    Clipboard.copy(finalContent);

    const position = preferences.appendPosition === "beginning" ? "prepended to" : "appended to";
    if (submitActionType === "append") {
      showHUD(`✅ Content ${position} Daily Note (also copied to clipboard)`);
    } else if (submitActionType === "open-daily-note") {
      showHUD("✅ Content copied to clipboard. Opened today's Daily Note.");
    } else {
      showHUD("✅ Content copied to clipboard");
    }

    popToRoot();
    closeMainWindow();
  };

  const getAppendUrl = () => {
    if (!dailyNoteBlockId || !formValues.spaceId) {
      return null;
    }

    const finalContent = formatContent(formValues.content, preferences);
    const index = preferences.appendPosition === "beginning" ? APPEND_POSITIONS.BEGINNING : APPEND_POSITIONS.END;

    return `craftdocs://createblock?parentBlockId=${
      dailyNoteBlockId
    }&spaceId=${formValues.spaceId}&content=${encodeURIComponent(finalContent)}&index=${index}`;
  };

  const getFallbackUrl = () => {
    if (!formValues.spaceId) {
      return null;
    }

    return buildDailyNoteOpenUrl("today", formValues.spaceId);
  };

  if (command.environment.environmentLoading || command.config.configLoading) {
    return <Form isLoading={true} />;
  }

  if (!command.environment.environment || command.environment.environment.status !== "ready") {
    return <CraftEnvironmentForm environment={command.environment.environment} />;
  }

  if (!config || config.enabledSpaces.length === 0) {
    return (
      <Form>
        <Form.Description
          title="No Spaces found"
          text="Open Craft and let it finish syncing before adding content to a Daily Note."
        />
      </Form>
    );
  }

  return (
    <Form
      isLoading={command.db.databasesLoading}
      navigationTitle="Add to Daily Note"
      actions={
        <ActionPanel>
          {(() => {
            const appendUrl = getAppendUrl();
            const fallbackUrl = getFallbackUrl();

            if (actionType === "append" && appendUrl) {
              return (
                <Action.OpenInBrowser
                  title="Add to Daily Note"
                  icon={Icon.Plus}
                  url={appendUrl}
                  onOpen={() => handleSubmit("append")}
                />
              );
            }

            if (actionType === "open-daily-note" && fallbackUrl) {
              return (
                <Action.OpenInBrowser
                  title="Create Daily Note & Copy Content"
                  icon={Icon.Calendar}
                  url={fallbackUrl}
                  onOpen={() => handleSubmit("open-daily-note")}
                />
              );
            }

            return (
              <Action.SubmitForm title="Add to Daily Note" icon={Icon.Plus} onSubmit={() => handleSubmit("submit")} />
            );
          })()}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Content"
        placeholder="What would you like to add to today's Daily Note?"
        value={formValues.content}
        onChange={(value) => setFormValues((previousState) => ({ ...previousState, content: value }))}
        info="This content will be added to today's Daily Note with a timestamp"
      />
      <Form.Dropdown
        id="spaceId"
        title="Space"
        value={formValues.spaceId}
        onChange={(value) => setFormValues((previousState) => ({ ...previousState, spaceId: value }))}
      >
        {config.enabledSpaces.map((space) => (
          <Form.Dropdown.Item
            key={space.spaceID}
            value={space.spaceID}
            title={config.getSpaceDisplayName(space.spaceID)}
          />
        ))}
      </Form.Dropdown>
      {command.db.fatalIssue ? (
        <Form.Description
          title="Search index unavailable"
          text="Craft's local search data could not be loaded. Your content will still be copied, and today's Daily Note will be opened."
        />
      ) : null}
    </Form>
  );
}
