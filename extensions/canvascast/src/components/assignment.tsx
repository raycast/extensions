import { List, Detail, Action, ActionPanel, Icon, Color, getPreferenceValues, Clipboard } from "@raycast/api";
import { assignment, Preferences } from "../utils/types";
import { Icons, convertHTMLToMD } from "../utils/utils";
import { useEffect, useState } from "react";
import { api } from "../utils/api";
import fetch from "node-fetch";

export const Assignment = (props: assignment) => {
  const preferences: Preferences = getPreferenceValues();
  const [apiAssignment, setApiAssignment] = useState<any>({});
  useEffect(() => {
    async function load() {
      const apiAssignment = await api.courses[props.course_id].assignments[props.id]
        .searchParams({
          "include[]": "submission",
        })
        .get();
      setApiAssignment(apiAssignment);
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
            title="View Assignment"
            icon={{ source: Icons["Assignment"], tintColor: Color.PrimaryText }}
            target={
              <Detail
                markdown={`# ${apiAssignment.name}\n\n${convertHTMLToMD(
                  apiAssignment.description ?? "No additional details were added for this assignment."
                )}`}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      url={`https://${preferences.domain}/courses/${props.course_id}/assignments/${props.id}`}
                    />
                    {apiAssignment.description?.match(/https:\/\/docs\.google\.com\/document\/d\/.*?\/copy/g)
                      ?.length && (
                      <Action.OpenInBrowser
                        title={`Copy Google Doc`}
                        icon={Icons.OpenGoogleCopyLink}
                        url={apiAssignment.description.match(/https:\/\/docs\.google\.com\/document\/d\/.*?\/copy/g)[0]}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    )}
                  </ActionPanel>
                }
                metadata={
                  <Detail.Metadata>
                    <Detail.Metadata.Label
                      title="Due Date"
                      text={new Date(props.date).toDateString() + " at " + props.pretty_date.substring(7)}
                    />
                    <Detail.Metadata.TagList title="Status">
                      {apiAssignment?.submission?.submitted_at ? (
                        apiAssignment?.submission?.submitted_at > props.date ? (
                          <Detail.Metadata.TagList.Item text="Late" color={Color.Red} />
                        ) : (
                          <Detail.Metadata.TagList.Item text="Submitted" color={Color.Green} />
                        )
                      ) : new Date() > props.date && props.special_missing ? (
                        <Detail.Metadata.TagList.Item text="Missing" color={Color.Red} />
                      ) : (
                        // (!apiAssignment?.submission?.submitted_at && new Date() > props.date)
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
                    <Detail.Metadata.Separator />
                    <Detail.Metadata.TagList title="Course">
                      <Detail.Metadata.TagList.Item
                        text={props.course}
                        color={props.course_color ?? Color.PrimaryText}
                      />
                    </Detail.Metadata.TagList>
                  </Detail.Metadata>
                }
              />
            }
          />
          <Action.OpenInBrowser
            url={`https://${preferences.domain}/courses/${props.course_id}/discussion_topics/${props.id}`}
          />
          {apiAssignment.description?.match(/https:\/\/docs\.google\.com\/document\/d\/.*?\/copy/g)?.length && (
            <Action.OpenInBrowser
              title={`Copy Google Doc`}
              icon={Icons.OpenGoogleCopyLink}
              url={apiAssignment.description.match(/https:\/\/docs\.google\.com\/document\/d\/.*?\/copy/g)[0]}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
      accessories={
        props?.time
          ? [
              {
                text: props.pretty_date,
                ...(apiAssignment?.submission?.submitted_at
                  ? { icon: Icons.Completed, tooltip: "Submitted" }
                  : props.special_missing
                  ? { icon: Icons.Missing, tooltip: "Missing" }
                  : {}),
              },
            ]
          : [{ text: props.pretty_date, icon: Icon.Calendar }]
      }
    />
  );
};
