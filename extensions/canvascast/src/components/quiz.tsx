import { List, Detail, Action, ActionPanel, Icon, Color, getPreferenceValues } from "@raycast/api";
import { quiz, Preferences } from "../utils/types";
import { Icons, convertHTMLToMD } from "../utils/utils";
import { useEffect, useState } from "react";
import { api } from "../utils/api";

export const Quiz = (props: quiz) => {
  const preferences: Preferences = getPreferenceValues();
  const [apiAssignment, setApiAssignment] = useState<any>({});
  const [apiSubmission, setApiSubmission] = useState<any>({});
  useEffect(() => {
    async function load() {
      const apiAssignment = await api.courses[props.course_id].quizzes[props.id].get();
      const apiSubmission = await api.courses[props.course_id].quizzes[props.id].submissions.get();
      setApiAssignment(apiAssignment);
      setApiSubmission(apiSubmission);
      console.log(apiSubmission);
    }
    load();
  }, []);

  return (
    <List.Item
      title={props.name}
      subtitle={props.course}
      icon={{ source: Icons["Quiz"], tintColor: props.color }}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Quiz"
            icon={{ source: Icons["Quiz"], tintColor: Color.PrimaryText }}
            target={
              <Detail
                markdown={`# ${apiAssignment.title}\n\n${convertHTMLToMD(apiAssignment.description)}`}
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
                      text={new Date(props.date).toDateString() + " at " + props.pretty_date.substring(7)}
                    />
                    {apiSubmission?.quiz_submissions?.[0] && apiSubmission?.quiz_submissions?.[0]?.kept_score && (
                      <Detail.Metadata.Label
                        title="Score"
                        text={
                          apiSubmission?.quiz_submissions?.[0]?.quiz_points_possible
                            ? `${Math.round(apiSubmission?.quiz_submissions?.[0]?.kept_score * 100) / 100}/${
                                apiSubmission?.quiz_submissions?.[0]?.quiz_points_possible
                              } point${apiSubmission?.quiz_submissions?.[0]?.quiz_points_possible == 1 ? "" : "s"}`
                            : `${Math.round(apiSubmission?.quiz_submissions?.[0]?.kept_score * 100) / 100} point${
                                apiSubmission?.quiz_submissions?.[0]?.kept_score == 1 ? "" : "s"
                              }`
                        }
                      />
                    )}
                    {!apiSubmission?.quiz_submissions?.[0] && apiAssignment.points_possible && (
                      <Detail.Metadata.Label
                        title="No Score Yet"
                        text={`${apiAssignment.points_possible} possible point${
                          apiAssignment.points_possible == 1 ? "" : "s"
                        }`}
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
