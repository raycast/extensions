import { List, Detail, Action, ActionPanel, Icon, Color, getPreferenceValues } from "@raycast/api";
import { quiz, Preferences, apiQuiz, apiAssignment } from "../utils/types";
import { Icons, convertHTMLToMD } from "../utils/utils";
import { useEffect, useState } from "react";
import { api } from "../utils/api";

export const Quiz = ({ quiz }: { quiz: quiz }) => {
  const preferences: Preferences = getPreferenceValues();
  const [apiAssignment, setApiAssignment] = useState<apiAssignment>({ name: "", description: "", points_possible: 0 });
  const [apiSubmission, setApiSubmission] = useState<apiQuiz>({ title: "", description: "", points_possible: 0 });
  useEffect(() => {
    async function load() {
      const apiAssignment = await api.courses[quiz.course_id].quizzes[quiz.id].get();
      const apiSubmission = await api.courses[quiz.course_id].quizzes[quiz.id].submissions.get();
      setApiAssignment(apiAssignment);
      setApiSubmission(apiSubmission);
      console.log(apiSubmission);
    }
    load();
  }, []);

  return (
    <List.Item
      title={quiz.name}
      subtitle={quiz.course}
      icon={{ source: Icons["Quiz"], tintColor: quiz.color }}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Quiz"
            icon={{ source: Icons["Quiz"], tintColor: Color.PrimaryText }}
            target={
              <Detail
                markdown={`# ${apiAssignment.name}\n\n${convertHTMLToMD(apiAssignment.description)}`}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      url={`https://${preferences.domain}/courses/${quiz.course_id}/discussion_topics/${quiz.id}`}
                    />
                  </ActionPanel>
                }
                metadata={
                  <Detail.Metadata>
                    <Detail.Metadata.Label
                      title="Due Date"
                      text={new Date(quiz.date).toDateString() + " at " + quiz.pretty_date.substring(7)}
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
                      <Detail.Metadata.TagList.Item text={quiz.course} color={quiz.course_color ?? Color.PrimaryText} />
                    </Detail.Metadata.TagList>
                  </Detail.Metadata>
                }
              />
            }
          />
          <Action.OpenInBrowser
            url={`https://${preferences.domain}/courses/${quiz.course_id}/discussion_topics/${quiz.id}`}
          />
        </ActionPanel>
      }
      accessories={
        quiz?.time
          ? [
              {
                text: quiz.pretty_date,
                ...(apiAssignment?.submission?.submitted_at
                  ? { icon: Icons.Completed, tooltip: "Submitted" }
                  : quiz.special_missing
                    ? { icon: Icons.Missing, tooltip: "Missing" }
                    : {}),
              },
            ]
          : [{ text: quiz.pretty_date, icon: Icon.Calendar }]
      }
    />
  );
};
