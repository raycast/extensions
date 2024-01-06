import {
  ActionPanel,
  Action,
  Icon,
  List,
  getPreferenceValues,
  Color,
  showToast,
  Toast,
  popToRoot,
  Image,
} from "@raycast/api";
import fs from "fs";
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

function getRelativeTime(epoch) {
  const now = Date.now();
  const elapsed = now - epoch * 1000; // time elapsed in milliseconds

  if (elapsed < 60000) {
    return "just now";
  } else if (elapsed < 3600000) {
    const minutes = Math.round(elapsed / 60000);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  } else if (elapsed < 86400000) {
    const hours = Math.round(elapsed / 3600000);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  } else if (elapsed < 2592000000) {
    const days = Math.round(elapsed / 86400000);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  } else if (elapsed < 31536000000) {
    const months = Math.round(elapsed / 2592000000);
    return `${months} month${months === 1 ? "" : "s"} ago`;
  } else {
    const years = Math.round(elapsed / 31536000000);
    return `${years} year${years === 1 ? "" : "s"} ago`;
  }
}

export default function Command() {
  const [courses, setCourses] = useState([]);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    const fetchCoursesText = async () => {
      try {
        const users_response = await client.request("GET", "/app-user-info");
        const uid = users_response.api_uid.toString();

        const course_response = await client.request("GET", `/users/${uid}/sections`);
        const course_data = await course_response;

        let maxTimestamp = 0;

        const courses = await Promise.all(
          course_data.section.map(async (course) => {
            try {
              const id = course.id;
              const courseTitle = course.course_title;
              const profileUrl = course.profile_url;

              // Fetch the grades for this course
              const grades_response = await client.request("GET", `/users/${uid}/grades/?section_id=${id}`);

              if (
                grades_response &&
                grades_response.section &&
                grades_response.section.length > 0 &&
                grades_response.section[0].final_grade &&
                grades_response.section[0].final_grade.length > 1
              ) {
                const grade = grades_response.section[0].final_grade[1].grade;
                let latestTimestamp = 0;

                // Iterate over all periods of this section
                grades_response.section[0].period.forEach((period) => {
                  // Iterate over the assignments for this period
                  period.assignment.forEach((assignment) => {
                    const timestamp = assignment.timestamp;

                    // Update the latest timestamp for this course if this assignment's timestamp is more recent
                    if (timestamp && timestamp > latestTimestamp) {
                      latestTimestamp = timestamp;
                    }

                    // Update the maxTimestamp if this timestamp is greater
                    if (timestamp && timestamp > maxTimestamp) {
                      maxTimestamp = timestamp;
                    }
                  });
                });

                return { id, courseTitle, grade, latestTimestamp, profileUrl };
              }
            } catch (error) {
              console.error(`Failed to fetch grade for course ${course.course_title}: ${error}`);
            }
          })
        );

        setCourses(courses.filter(Boolean));
      } catch (error) {
        popToRoot();
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid Schoology API key and/or secret",
          message:
            "Head to [district].schoology.com/api and paste in your newly generated key and secret into this extension's preferences.",
        });
        setCourses([]);
        console.error(error);
      }
    };

    fetchCoursesText();
  }, []);

  return (
    <List navigationTitle="Show Grades" searchBarPlaceholder="Search your courses" isLoading={courses.length === 0}>
      {courses
        .filter((course) => course.courseTitle.includes(searchText))
        .map((course) => {
          return (
            <List.Item
              title={course.courseTitle}
              subtitle={`Updated ${getRelativeTime(course.latestTimestamp)}`}
              icon={{ source: course.profileUrl, mask: Image.Mask.Circle }}
              accessories={[
                {
                  tag: {
                    value: getLetterGrade(course.grade),
                    color: getColorBasedOnGrade(getLetterGrade(Number(course.grade))),
                  },
                },
                { text: `${course.grade}%` },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    icon={Icon.List}
                    title="View Graded Assignments"
                    target={
                      <CourseDetail
                        sectionID={course.id}
                        courseTitle={course.courseTitle}
                        profileUrl={course.profileUrl}
                      />
                    }
                  />
                  <Action.Paste title="Paste Grade" content={`${course.courseTitle}:\nPercentage: ${course.grade}%`} />
                  <Action.CopyToClipboard
                    title="Copy Grade"
                    content={`${course.courseTitle}:\nPercentage: ${course.grade}%`}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
function CourseDetail({ sectionID, courseTitle, profileUrl }) {
  const [grades, setGrades] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  function formatPercentage(value) {
    const percentage = (value * 100).toFixed(2);
    return percentage.endsWith(".00") ? percentage.slice(0, -3) : percentage;
  }

  function getExceptionText(exception) {
    switch (exception) {
      case 1:
        return "Excused";
      case 2:
        return "Incomplete";
      case 3:
        return "Missing";
      default:
        return "";
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        console.log("Fetching user info...");
        const users_response = await client.request("GET", "/app-user-info");
        const uid = users_response.api_uid.toString();
        console.log("Fetching grades...");
        const grades_response = await client.request("GET", `/users/${uid}/grades/?section_id=${sectionID}`);

        const grades_data = grades_response.section[0].period[0].assignment;
        setCategories(grades_response.section[0].grading_category);

        const assignmentPromises = grades_data.map((grade) => {
          console.log(`Fetching assignment ${grade.assignment_id}...`);
          return client.request("GET", `/sections/${sectionID}/grade_items/${grade.assignment_id}`);
        });

        const assignments_data = await Promise.allSettled(assignmentPromises);
        const assignments = assignments_data.map((result) => (result.status === "fulfilled" ? result.value : null));

        let gradesWithAssignments = grades_data.map((grade, index) => ({
          ...grade,
          assignment: assignments[index],
        }));

        // Filter out invalid grades
        const invalidResponse =
          "<html>\r\n<head><title>404 Not Found</title></head>\r\n<body>\r\n<center><h1>404 Not Found</h1></center>\r\n<hr><center>nginx</center>\r\n</body>\r\n</html>\r\n";
        gradesWithAssignments = gradesWithAssignments.filter((grade, index) => {
          if (grade.assignment === invalidResponse) {
            console.log(`Invalid grade found at index ${index}, removing it from the list.`);
            return false;
          }
          return true;
        });

        setGrades(gradesWithAssignments);

        // After all assignments have been fetched, fetch again the ones with a broken title
        const fetchBrokenTitles = async () => {
          let brokenTitlesExist = false;
          console.log("Checking for broken titles...");
          for (let i = 0; i < gradesWithAssignments.length; i++) {
            if (!gradesWithAssignments[i].assignment || !gradesWithAssignments[i].assignment.title) {
              brokenTitlesExist = true;
              console.log(`Fetching broken title for assignment ${gradesWithAssignments[i].assignment_id}...`);
              try {
                const assignment = await client.request(
                  "GET",
                  `/sections/${sectionID}/grade_items/${gradesWithAssignments[i].assignment_id}`
                );
                if (!assignment || !assignment.title) {
                  if (assignment !== "You have reached Schoology's api request limit of 50 requests per 5 seconds") {
                    console.log(
                      `Title for assignment ${gradesWithAssignments[i].assignment_id} is still broken. Removing it from the list.`
                    );
                    gradesWithAssignments.splice(i, 1); // Remove the assignment from the list
                    i--; // Decrement the index to account for the removed element
                  } else {
                    console.log(`Title for assignment ${gradesWithAssignments[i].assignment_id} is still broken.`);
                  }
                } else {
                  console.log(`Successfully fetched title for assignment ${gradesWithAssignments[i].assignment_id}.`);
                  gradesWithAssignments[i].assignment = assignment;
                }
              } catch (error) {
                console.error(`Failed to fetch assignment ${gradesWithAssignments[i].assignment_id}: ${error}`);
              }
            }
          }
          setGrades([...gradesWithAssignments]); // Update the state with the latest data
          if (brokenTitlesExist) {
            console.log("Waiting for 5 seconds before the next check...");
            setTimeout(fetchBrokenTitles, 5000); // Wait for 5 seconds before the next check
          } else {
            setIsLoading(false); // All assignments have been fetched successfully or removed, stop the loading indicator
          }
        };
        setIsLoading(true); // Start the loading indicator
        fetchBrokenTitles();
      } catch (error) {
        console.error(`Failed to fetch data: ${error}`);
      }
    };

    fetchData();
  }, [sectionID]);

  function capitalizeFirstLetter(string) {
    return string ? string.charAt(0).toUpperCase() + string.slice(1) : "";
  }

  // Calculate the overall grade for the course
  let overallGrade = 0;

  if (categories.every((category) => category.weight === undefined)) {
    const totalPoints = grades
      .filter((grade) => grade.exception !== 1)
      .reduce((total, grade) => total + grade.grade, 0);
    const totalMaxPoints = grades
      .filter((grade) => grade.exception !== 1)
      .reduce((total, grade) => total + grade.max_points, 0);
    overallGrade = totalPoints / totalMaxPoints;
  } else {
    overallGrade = categories.reduce((total, category) => {
      const categoryGrades = grades.filter((grade) => grade.category_id === category.id && grade.exception !== 1);
      const totalPoints = categoryGrades.reduce((total, grade) => total + grade.grade, 0);
      const totalMaxPoints = categoryGrades.reduce((total, grade) => total + grade.max_points, 0);
      const categoryWeight = category.weight ? category.weight / 100 : 1 / categories.length;
      return total + (totalPoints / totalMaxPoints) * categoryWeight;
    }, 0);
  }

  const totalPoints = grades.filter((grade) => grade.exception !== 1).reduce((total, grade) => total + grade.grade, 0);
  const totalMaxPoints = grades
    .filter((grade) => grade.exception !== 1)
    .reduce((total, grade) => total + grade.max_points, 0);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`${courseTitle}`}
      searchBarPlaceholder={`Search for graded assignments`}
    >
      {!isLoading && (
        <List.Item
          title="Overall Grade for this Course"
          icon={{ source: profileUrl, mask: Image.Mask.Circle }}
          accessories={[
            {
              text: `${formatPercentage(overallGrade)}%`,
            },
            {
              tag: {
                value: `${totalPoints}/${totalMaxPoints}`,
                color: Color.PrimaryText,
              },
              tooltip: "Total Points Earned / Total Points Possible",
            },
            {
              tag: {
                value: `${getLetterGrade(overallGrade * 100)}`,
                color: getColorBasedOnGrade(getLetterGrade(overallGrade * 100)),
              },
            },
          ]}
        />
      )}
      {categories.map((category, index) => {
        const categoryGrades = grades
          .filter((grade) => grade.category_id === category.id)
          .sort((b, a) => a.timestamp - b.timestamp); // Sort grades by timestamp
        const categoryTotalPoints = categoryGrades.reduce((total, grade) => total + grade.grade, 0);
        const categoryTotalMaxPoints = categoryGrades.reduce((total, grade) => total + grade.max_points, 0);
        return (
          <List.Section
            key={index}
            title={`${capitalizeFirstLetter(
              category.title
            )} (Points Earned: ${categoryTotalPoints}/${categoryTotalMaxPoints})${
              category.weight ? ` (Weight: ${category.weight}%)` : ""
            }`}
          >
            {categoryGrades.map((grade, index) =>
              grade.assignment && grade.assignment.title ? (
                <List.Item
                  key={index}
                  icon={Icon.Checkmark}
                  title={capitalizeFirstLetter(grade.assignment.title)}
                  subtitle={
                    grade.timestamp
                      ? new Date(grade.timestamp * 1000).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : undefined
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
                    ...(grade.exception
                      ? [
                          {
                            tag: {
                              value: getExceptionText(grade.exception),
                              color: grade.exception === 1 ? Color.Green : Color.Red,
                            },
                          },
                        ]
                      : []),
                    ...(grade.comment ? [{ icon: Icon.Bubble, tooltip: grade.comment }] : []),
                    ...(grade.exception !== 1
                      ? [
                          {
                            text: `${formatPercentage(grade.grade / grade.max_points)}%`,
                          },
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
                        ]
                      : []),
                  ]}
                  actions={
                    <ActionPanel title="Assignment Actions">
                      <Action.CopyToClipboard
                        title="Copy Grade"
                        icon={Icon.Clipboard}
                        content={`Course: ${courseTitle}\nPercentage: ${formatPercentage(
                          grade.grade / grade.max_points
                        )}%`}
                      />
                      {grade.comment && (
                        <Action.CopyToClipboard
                          title="Copy Comment"
                          icon={Icon.Message}
                          content={`Course: ${courseTitle}\nComments: ${grade.comment}`}
                        />
                      )}
                    </ActionPanel>
                  }
                />
              ) : null
            )}
          </List.Section>
        );
      })}
    </List>
  );
}
