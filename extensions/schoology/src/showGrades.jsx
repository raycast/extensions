import { ActionPanel, Action, Icon, List, getPreferenceValues, Color, showToast, Toast, popToRoot } from "@raycast/api";
import SchoologyAPI from "schoologyapi";
import { useEffect, useState } from "react";

const preferences = getPreferenceValues();
const client = new SchoologyAPI(preferences.key, preferences.secret);

function getLetterGrade(percentageGrade) {
  if (percentageGrade >= 97) return "A+";
  if (percentageGrade >= 93) return "A";
  if (percentageGrade >= 90) return "A-";
  if (percentageGrade >= 87) return "B+";
  if (percentageGrade >= 83) return "B";
  if (percentageGrade >= 80) return "B-";
  if (percentageGrade >= 77) return "C+";
  if (percentageGrade >= 73) return "C";
  if (percentageGrade >= 70) return "C-";
  if (percentageGrade >= 67) return "D+";
  if (percentageGrade >= 63) return "D";
  if (percentageGrade >= 60) return "D-";
  return "F";
}

const colorCache = {};
function getColorBasedOnGrade(letterGrade) {
  if (colorCache[letterGrade]) return colorCache[letterGrade];

  let color;
  switch (letterGrade) {
    case "A+":
    case `A`:
    case "A-":
      color = Color.Green;
      break;
    case "B":
    case "B+":
    case "B-":
      color = Color.Blue;
      break;
    case "C+":
    case "C-":
    case "C":
      color = Color.Orange;
      break;
    case "D-":
    case "D+":
    case "D":
      color = Color.Red;
      break;
    case "F":
      color = Color.Gray;
      break;
    default:
      color = Color.PrimaryText;
  }

  colorCache[letterGrade] = color;
  return color;
}

export default function Command() {
  const [coursesText, setCoursesText] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [gradesArr, setGradesArr] = useState([]);
  const [coursesHashmap2, setCoursesHashmap2] = useState({});

  useEffect(() => {
    const fetchCoursesText = async () => {
      try {
        const users_response = await client.request("GET", "/app-user-info");
        const uid = users_response.api_uid.toString();

        const course_response = await client.request("GET", `/users/${uid}/sections`);
        const course_data = await course_response;

        const coursesHashmap = {};
        const gradesMap = {};

        const gradePromises = course_data.section.map(async (course) => {
          try {
            const id = course.id;
            const courseTitle = course.course_title;

            coursesHashmap[id] = courseTitle;

            const user_grades = await client.request("GET", `/users/${uid}/grades/?section_id=${id}`);

            if (
              user_grades &&
              user_grades.section &&
              user_grades.section.length > 0 &&
              user_grades.section[0].final_grade &&
              user_grades.section[0].final_grade.length > 1
            ) {
              return { id, user_grades };
            }
          } catch (error) {
            console.error(`Failed to fetch grade for course ${course.course_title}: ${error}`);
          }
        });

        const grades = (await Promise.all(gradePromises)).filter(Boolean);

        grades.forEach(({ id, user_grades }) => {
          const grade = user_grades.section[0].final_grade[1].grade;
          gradesMap[id] = grade;
        });

        setCoursesHashmap2(coursesHashmap);
        setGradesArr(gradesMap);
        setCoursesText(Object.keys(gradesMap));
      } catch (error) {
        popToRoot();
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid Schoology API key and/or secret",
          message:
            "Head to [district].schoology.com/api and paste in your newly generated key and secret into this extension's preferences.",
        });
        setCoursesText([]);
        console.error(error);
      }
    };

    fetchCoursesText();
  }, []);

  return (
    <List navigationTitle="Show Grades" searchBarPlaceholder="Search your courses" isLoading={coursesText.length === 0}>
      {coursesText
        .filter((course) => course.includes(searchText))
        .map((course) => (
          <List.Item
            title={coursesHashmap2[course] || course}
            icon={Icon.CircleProgress100}
            accessories={[
              {
                tag: {
                  value: getLetterGrade(gradesArr[course]),
                  color: getColorBasedOnGrade(getLetterGrade(Number(gradesArr[course]))),
                },
              },

              { text: `${gradesArr[course]}%` },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  icon={Icon.List}
                  title="View Graded Assignments"
                  target={<CourseDetail sectionID={course.split(":")[0]} courseTitle={coursesHashmap2[course]} />}
                />
                <Action.Paste
                  title="Paste Grade"
                  content={`${coursesHashmap2[course]}:\nPercentage: ${gradesArr[course]}%`}
                />

                <Action.CopyToClipboard
                  title="Copy Grade"
                  content={`${coursesHashmap2[course]}:\nPercentage: ${gradesArr[course]}%`}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}

function CourseDetail({ sectionID, courseTitle }) {
  const [grades, setGrades] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const users_response = await client.request("GET", "/app-user-info");
        const uid = users_response.api_uid.toString();
        const grades_response = await client.request("GET", `/users/${uid}/grades/?section_id=${sectionID}`);
        const grades_data = grades_response.section[0].period[0].assignment;
        setCategories(grades_response.section[0].grading_category);

        const assignmentPromises = grades_data.map((grade) =>
          client.request("GET", `/sections/${sectionID}/grade_items/${grade.assignment_id}`)
        );
        const assignments_data = await Promise.all(assignmentPromises);
        const gradesWithAssignments = grades_data.map((grade, index) => ({
          ...grade,
          assignment: assignments_data[index],
        }));
        setGrades(gradesWithAssignments);
      } catch (error) {
        console.error(`Failed to fetch data: ${error}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [sectionID]);

  function capitalizeFirstLetter(string) {
    return string ? string.charAt(0).toUpperCase() + string.slice(1) : "";
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${courseTitle}`}
      searchBarPlaceholder={`Search for graded assignments`}
    >
      {categories.map((category, index) => (
        <List.Section key={index} title={capitalizeFirstLetter(category.title)}>
          {grades
            .filter((grade) => grade.category_id === category.id)
            .map((grade, index) => (
              <List.Item
                key={index}
                icon={Icon.Checkmark}
                title={
                  grade.assignment && grade.assignment.title
                    ? capitalizeFirstLetter(grade.assignment.title)
                    : `Assignment ID: ${grade.assignment_id}`
                }
                accessories={[
                  {
                    ...((grade.grade / grade.max_points) * 100 > 100 && {
                      tag: {
                        value: "Extra Credit",
                        color: Color.Yellow,
                      },
                    }),
                  },
                  ...(grade.comment ? [{ icon: Icon.Bubble, tooltip: grade.comment }] : []),
                  { text: `${((grade.grade / grade.max_points) * 100).toFixed(1).replace(/\.0$/, "")}%` },
                  {
                    tag: {
                      value: `${grade.grade}/${grade.max_points}`,
                      color: Color.PrimaryText,
                    },
                  },
                  {
                    tag: {
                      value: `${getLetterGrade((grade.grade / grade.max_points) * 100)}`,
                      color: getColorBasedOnGrade(getLetterGrade((grade.grade / grade.max_points) * 100)),
                    },
                  },
                ]}
                actions={
                  <ActionPanel title="Assignment Actions">
                    <Action.CopyToClipboard
                      title="Copy Grade"
                      icon={Icon.Clipboard}
                      content={`Course: ${courseTitle}\nPercentage: ${(grade.grade / grade.max_points) * 100}%`}
                    />
                    <Action.Paste
                      title="Copy Grade"
                      icon={Icon.Clipboard}
                      content={`Course: ${courseTitle}\nPercentage: ${(grade.grade / grade.max_points) * 100}%`}
                    />
                    {grade.comment && (
                      <>
                        <Action.CopyToClipboard
                          title="Copy Comment"
                          icon={Icon.Message}
                          content={`Course: ${courseTitle}\nComments: ${grade.comment}`}
                        />
                        <Action.Paste
                          title="Paste Comment"
                          icon={Icon.Message}
                          content={`Course: ${courseTitle}\nComments: ${grade.comment}`}
                        />
                      </>
                    )}
                  </ActionPanel>
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
