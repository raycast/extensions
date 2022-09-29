import { List, Detail, Action, ActionPanel, Icon, Color, getPreferenceValues } from "@raycast/api";
import { announcement, Preferences } from "../utils/types";
import { Icons } from "../utils/utils";
import { useState, useEffect } from 'react';

export const Announcement = (props: announcement) => {
  const preferences: Preferences = getPreferenceValues();
  const [markdown, setMarkdown] = useState<string>('');
  useEffect(() => {
    async function load () {
      if (typeof props.markdown == 'function') {
        let output = props.markdown();
        if (output instanceof Promise) output = await output;
        setMarkdown(output);
      } else {
        setMarkdown(props.markdown);
      }
    }
    load();
  }, []);

  return (
    <List.Item
      title={props.title}
      subtitle={props.course}
      icon={{ source: Icons["Announcement"], tintColor: props.color }}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Announcement"
            icon={{ source: Icons["Announcement"], tintColor: Color.PrimaryText }}
            target={
              <Detail
                markdown={markdown ?? ''}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      url={`https://${preferences.domain}/courses/${props.course_id}/discussion_topics/${props.id}`}
                    />
                  </ActionPanel>
                }
              />
            }
          />
          <Action.OpenInBrowser
            url={`https://${preferences.domain}/courses/${props.course_id}/discussion_topics/${props.id}`}
          />
        </ActionPanel>
      }
      accessories={props?.time ? [{ text: props.pretty_date }] : [{ text: props.pretty_date, icon: Icon.Calendar }]}
    />
  );
};
