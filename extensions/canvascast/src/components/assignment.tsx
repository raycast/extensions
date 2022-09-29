import { List, Detail, Action, ActionPanel, Icon, Color, getPreferenceValues } from "@raycast/api";
import { assignment, Preferences } from "../utils/types";
import { Icons } from "../utils/utils";
import { useEffect, useState } from "react";
import { api } from "../utils/api";

export const Assignment = (props: assignment) => {
  const preferences: Preferences = getPreferenceValues();
  const [apiAssignment, setApiAssignment] = useState<any>({});
  const [markdown, setMarkdown] = useState<string>("");
  useEffect(() => {
    async function load() {
      if (props.description instanceof Promise) setMarkdown(await props.description);
      else setMarkdown(props.description);
      const apiAssignment = await api.courses[props.course_id].assignments[props.id]
        .searchParams({
          "include[]": "submission",
        })
        .get();
      setApiAssignment(apiAssignment);
      console.log(apiAssignment.submission?.grade);
    }
    load();
  }, []);

  return (
    <List.Item
      title={props.name}
      subtitle={props.course}
      icon={{ source: Icons["Assignment"], tintColor: props.color }}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Description"
            icon={{ source: Icons["Assignment"], tintColor: Color.PrimaryText }}
            target={
              <Detail
                markdown={markdown}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      url={`https://${preferences.domain}/courses/${props.course_id}/discussion_topics/${props.id}`}
                    />
                  </ActionPanel>
                }
                metadata={
                  <Detail.Metadata>
                    <Detail.Metadata.Label
                      title="Due Date"
                      text={props.date.toDateString() + " at " + props.pretty_date.substring(7)}
                    />
                    <Detail.Metadata.TagList title="Status">
                      {apiAssignment?.submission?.submitted_at ? (
                        apiAssignment?.submission?.submitted_at > props.date ? (
                          <Detail.Metadata.TagList.Item text="Late" color={Color.Red} />
                        ) : (
                          <Detail.Metadata.TagList.Item text="Submitted" color={Color.Green} />
                        )
                      ) : new Date() > props.date ? (
                        <Detail.Metadata.TagList.Item text="Missing" color={Color.Red} />
                      ) : (
                        <Detail.Metadata.TagList.Item text="No Submission" color={Color.SecondaryText} />
                      )}
                      {apiAssignment?.submission?.graded_at && (
                        <Detail.Metadata.TagList.Item text="Graded" color={Color.PrimaryText} />
                      )}
                    </Detail.Metadata.TagList>
                    {apiAssignment?.submission?.graded_at && (
                      <Detail.Metadata.Label
                        title="Score"
                        text={
                          apiAssignment.submission?.grade == "complete"
                            ? `Complete/${apiAssignment.points_possible} point${
                                apiAssignment.points_possible !== 1 ? "s" : ""
                              }`
                            : `${apiAssignment.submission.score}/${apiAssignment.points_possible} point${
                                apiAssignment.points_possible !== 1 ? "s" : ""
                              }`
                        }
                      />
                    )}
                  </Detail.Metadata>
                }
              />
            }
          />
          <Action.OpenInBrowser
            url={`https://${preferences.domain}/courses/${props.course_id}/discussion_topics/${props.id}`}
          />
        </ActionPanel>
      }
      accessories={
        props?.time
          ? [
              {
                text: props.pretty_date,
                ...(apiAssignment?.submission?.submitted_at ? { icon: Icon.Checkmark, tooltip: "Submitted" } : {}),
              },
            ]
          : [{ text: props.pretty_date, icon: Icon.Calendar }]
      }
    />
  );
};
