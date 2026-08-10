import {
  ActionPanel,
  Icon,
  List,
  getPreferenceValues,
  Color,
  showToast,
  Toast,
  Action,
  popToRoot,
  environment,
  Image,
  Detail,
} from "@raycast/api";
import SchoologyAPI from "schoologyapi";
import QuickChart from "quickchart-js";
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
      {courses.map((course) => {
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

function getChartUrl(grades, categories) {
  grades.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const dataPoints = grades.map((grade, index) => {
    const gradesUpToIndex = grades.slice(0, index + 1).filter((grade) => grade.exception !== 1 && grade.grade !== null);

    let overallGrade = 0;
    let totalWeights = 0;

    categories.forEach((category) => {
      const categoryGrades = gradesUpToIndex.filter(
        (grade) => grade.category_id === category.id && grade.grade !== null
      );
      const categoryPoints = categoryGrades.reduce((total, grade) => total + grade.grade, 0);
      const categoryMaxPoints = categoryGrades.reduce((total, grade) => total + grade.max_points, 0);
      const categoryWeight = category.weight ? category.weight / 100 : 1 / categories.length;

      if (categoryMaxPoints > 0) {
        const categoryGrade = categoryPoints / categoryMaxPoints;
        overallGrade += categoryGrade * categoryWeight;
        totalWeights += categoryWeight;
      }
    });

    overallGrade = totalWeights > 0 ? overallGrade / totalWeights : 0;

    return overallGrade * 100;
  });

  const minGrade = Math.floor(Math.min(...dataPoints) / 10) * 10; // Round down to the nearest 10
  const maxGrade = Math.ceil(Math.max(...dataPoints) / 10) * 10; // Round up to the nearest 10
  const shadowOffset = 2; // Adjust this to change the shadow offset
  const shadowColor = "rgba(0, 0, 0, 0.2)"; // Adjust this to change the shadow color

  const dataPointsShadow = dataPoints.map((point, index) => {
    // Create a shadow effect by offsetting the data points and using a lower opacity
    return index < dataPoints.length - shadowOffset ? null : point - shadowOffset;
  });

  const chart = new QuickChart();
  let lastDate = null;
  chart
    .setConfig({
      type: "line",
      data: {
        labels: grades.map((grade) => {
          const date = new Date(grade.timestamp * 1000);
          const formattedDate = `${date.toLocaleString("default", {
            month: "short",
          })} ${date.getDate()}, ${date.getFullYear()}`;

          if (formattedDate === lastDate) {
            // If the date is the same as the last one, return an empty string
            return "";
          } else {
            // Otherwise, update lastDate and return the formatted date
            lastDate = formattedDate;
            return formattedDate;
          }
        }),
        datasets: [
          {
            label: "Shadow",
            data: dataPointsShadow,
            fill: false,
            borderColor: "transparent", // Make the line transparent
            pointBorderColor: shadowColor, // Make the point border the same color as the points
            pointBackgroundColor: shadowColor, // Color the points
            lineTension: 0.3,
            pointRadius: 0, // Hide the points for the shadow dataset
          },
          {
            label: "Overall Grade (%)",
            data: dataPoints,
            fill: false,
            borderColor: "red", // Set the line color
            pointBorderColor: environment.appearance === "dark" ? "rgb(144, 238, 144)" : "blue", // Make the point border the same color as the points
            pointBackgroundColor: "blue", // Color the points
            lineTension: 0.3,
            borderWidth: 3,
          },
        ],
      },
      options: {
        legend: {
          display: false, // Hide the legend
        },
        scales: {
          yAxes: [
            {
              ticks: {
                min: minGrade, // Set the minimum value of the y-axis
                max: maxGrade, // Set the maximum value of the y-axis
                fontColor: environment.appearance === "dark" ? "white" : "black", // Make the text white if environment appearance is dark, otherwise make it black
                callback: function (value) {
                  return value + "%"; // Append '%' to the y-axis labels
                },
              },
              gridLines: {
                color: environment.appearance === "dark" ? "white" : "black", // Make the axes black
              },
            },
          ],
          xAxes: [
            {
              ticks: {
                fontColor: environment.appearance === "dark" ? "white" : "black", // Make the text white if environment appearance is dark, otherwise make it black
              },
              gridLines: {
                color: environment.appearance === "dark" ? "white" : "black", // Make the axes black
              },
            },
          ],
        },
      },
    })
    .setWidth(1445) // Set the width to 1455
    .setHeight(700) // Set the height to 750
    .setBackgroundColor(`transparent`);

  return chart.getUrl();
}
async function gradesInBrowser({ grades, categories }) {
  grades.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  const dataPoints = grades.map((grade, index) => {
    const gradesUpToIndex = grades.slice(0, index + 1).filter((grade) => grade.exception !== 1 && grade.grade !== null);

    let overallGrade = 0;
    let totalWeights = 0;

    categories.forEach((category) => {
      const categoryGrades = gradesUpToIndex.filter(
        (grade) => grade.category_id === category.id && grade.grade !== null
      );
      const categoryPoints = categoryGrades.reduce((total, grade) => total + grade.grade, 0);
      const categoryMaxPoints = categoryGrades.reduce((total, grade) => total + grade.max_points, 0);
      const categoryWeight = category.weight ? category.weight / 100 : 1 / categories.length;

      if (categoryMaxPoints > 0) {
        const categoryGrade = categoryPoints / categoryMaxPoints;
        overallGrade += categoryGrade * categoryWeight;
        totalWeights += categoryWeight;
      }
    });

    overallGrade = totalWeights > 0 ? overallGrade / totalWeights : 0;

    return overallGrade * 100;
  });

  const minGrade = Math.floor(Math.min(...dataPoints) / 10) * 10; // Round down to the nearest 10
  const maxGrade = Math.ceil(Math.max(...dataPoints) / 10) * 10; // Round up to the nearest 10
  const shadowOffset = 2; // Adjust this to change the shadow offset
  const shadowColor = "white"; // Adjust this to change the shadow color

  const dataPointsShadow = dataPoints.map((point, index) => {
    // Create a shadow effect by offsetting the data points and using a lower opacity
    return index < dataPoints.length - shadowOffset ? null : point - shadowOffset;
  });

  const chart = new QuickChart();
  let lastDate = null;
  chart
    .setConfig({
      type: "line",
      data: {
        labels: grades.map((grade) => {
          const date = new Date(grade.timestamp * 1000);
          const formattedDate = `${date.toLocaleString("default", {
            month: "short",
          })} ${date.getDate()}, ${date.getFullYear()}`;

          if (formattedDate === lastDate) {
            // If the date is the same as the last one, return an empty string
            return "";
          } else {
            // Otherwise, update lastDate and return the formatted date
            lastDate = formattedDate;
            return formattedDate;
          }
        }),
        datasets: [
          {
            label: "Shadow",
            data: dataPointsShadow,
            fill: false,
            borderColor: "transparent", // Make the line transparent
            pointBorderColor: shadowColor, // Make the point border the same color as the points
            pointBackgroundColor: shadowColor, // Color the points
            lineTension: 0.3,
            pointRadius: 0, // Hide the points for the shadow dataset
          },
          {
            label: "Overall Grade (%)",
            data: dataPoints,
            fill: false,
            borderColor: "red", // Set the line color
            pointBorderColor: "blue", // Make the point border the same color as the points
            pointBackgroundColor: "blue", // Color the points
            lineTension: 0.3,
            borderWidth: 3,
          },
        ],
      },
      options: {
        legend: {
          display: false, // Hide the legend
        },
        scales: {
          yAxes: [
            {
              ticks: {
                min: minGrade, // Set the minimum value of the y-axis
                max: maxGrade, // Set the maximum value of the y-axis
                fontColor: "black", // Make the text black
                callback: function (value) {
                  return value + "%"; // Append '%' to the y-axis labels
                },
              },
              gridLines: {
                color: "black", // Make the axes black
              },
            },
          ],
          xAxes: [
            {
              ticks: {
                fontColor: "black", // Make the text black
              },
              gridLines: {
                color: "black", // Make the axes black
              },
            },
          ],
        },
      },
    })
    .setWidth(1445) // Set the width to 1455
    .setHeight(700) // Set the height to 750
    .setBackgroundColor(`transparent`);

  // Shorten the URL
  const shortUrl = await chart.getShortUrl();

  // Extract the unique ID from the shortened URL
  const url = new URL(shortUrl);
  const uniqueId = url.pathname.split("/").pop();

  // Create the iframe URL
  const iframeUrl = `https://quickchart.io/chart-maker/view/${uniqueId}`;

  return iframeUrl;
}
function CourseDetail({ sectionID, courseTitle, profileUrl }) {
  const [grades, setGrades] = useState([]);
  const [data, setData] = useState([]);
  const [scale, setScale] = useState([]);
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
  const [url, setUrl] = useState(null);

  useEffect(() => {
    const fetchUrl = async () => {
      const result = await gradesInBrowser({ grades, categories });
      setUrl(result);
    };

    fetchUrl();
  }, [grades, categories]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const users_response = await client.request("GET", "/app-user-info");
        const uid = users_response.api_uid.toString();
        const scale = await client.request("GET", `/sections/${sectionID}/grading_scales`);
        setScale(scale);
        const grades_response = await client.request("GET", `/users/${uid}/grades/?section_id=${sectionID}`);
        setData(grades_response);

        const grades_data = grades_response.section[0].period[0].assignment;
        setCategories(grades_response.section[0].grading_category);

        const assignmentPromises = grades_data.map((grade) => {
          return client.request(
            "GET",
            `/sections/${sectionID}/grade_items/${grade.assignment_id}?with_attachments=true`
          );
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
        gradesWithAssignments = gradesWithAssignments.filter((grade) => {
          if (grade.assignment === invalidResponse) {
            return false;
          }
          return true;
        });
        // eslint-disable-next-line no-empty
        setGrades(gradesWithAssignments);

        // After all assignments have been fetched, fetch again the ones with a broken title
        const fetchBrokenTitles = async () => {
          let brokenTitlesExist = false;
          for (let i = 0; i < gradesWithAssignments.length; i++) {
            if (!gradesWithAssignments[i].assignment || !gradesWithAssignments[i].assignment.title) {
              brokenTitlesExist = true;
              try {
                const assignment = await client.request(
                  "GET",
                  `/sections/${sectionID}/grade_items/${gradesWithAssignments[i].assignment_id}?with_attachments=true`
                );
                if (!assignment || !assignment.title) {
                  if (assignment !== "You have reached Schoology's api request limit of 50 requests per 5 seconds") {
                    gradesWithAssignments.splice(i, 1); // Remove the assignment from the list
                    i--; // Decrement the index to account for the removed element
                  }
                } else {
                  gradesWithAssignments[i].assignment = assignment;
                }
              } catch (error) {
                console.error(`Failed to fetch assignment ${gradesWithAssignments[i].assignment_id}: ${error}`);
              }
            }
          }
          setGrades([...gradesWithAssignments]); // Update the state with the latest data
          if (brokenTitlesExist) {
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
  let totalPoints = 0; // Define totalPoints in the outer scope
  let totalMaxPoints = 0; // Define totalMaxPoints in the outer scope
  // Calculate the overall grade for the course
  let overallGrade = 0;
  let totalWeights = 0;

  categories.forEach((category) => {
    const categoryGrades = grades.filter(
      (grade) => grade.category_id === category.id && grade.exception !== 1 && grade.grade !== null
    );
    const categoryPoints = categoryGrades.reduce((total, grade) => total + grade.grade, 0);
    const categoryMaxPoints = categoryGrades.reduce((total, grade) => total + grade.max_points, 0);
    const categoryWeight = category.weight ? category.weight / 100 : 1 / categories.length;

    if (categoryMaxPoints > 0) {
      const categoryGrade = categoryPoints / categoryMaxPoints; // Calculate the grade for the category
      overallGrade += categoryGrade * categoryWeight; // Add the weighted grade to the overall grade
      totalWeights += categoryWeight; // Add the weight to the total weights
    }

    // Update totalPoints and totalMaxPoints without weighting
    totalPoints += categoryPoints;
    totalMaxPoints += categoryMaxPoints;
  });

  overallGrade = totalWeights > 0 ? overallGrade / totalWeights : 0; // Calculate the overall grade
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
          actions={
            <ActionPanel title="Course Actions">
              <Action.Push
                title="Open Graph"
                icon={Icon.LineChart}
                target={
                  <Detail
                    markdown={`![](${getChartUrl(grades, categories)})\n⚠️Graph may be inaccurate`}
                    navigationTitle={`Graph for ${courseTitle}`}
                    actions={
                      <ActionPanel>
                        <Action.OpenInBrowser title="Open in Browser" icon={Icon.Safari} url={url} />
                      </ActionPanel>
                    }
                  />
                }
              />
              <Action.OpenInBrowser title="Open Graph in Browser" icon={Icon.Safari} url={url} />
              <Action.CopyToClipboard title="Copy Data" icon={Icon.Code} content={JSON.stringify(data)} />
              <Action.CopyToClipboard title="Copy Scale" icon={Icon.Code} content={JSON.stringify(scale)} />
            </ActionPanel>
          }
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
        const categoryTotalPoints = categoryGrades.reduce(
          (total, grade) => (grade.exception !== 1 ? total + grade.grade : total),
          0
        );
        const categoryTotalMaxPoints = categoryGrades.reduce(
          (total, grade) => (grade.exception !== 1 ? total + grade.max_points : total),
          0
        );
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
                            ...(grade.max_points !== null && {
                              text: `${formatPercentage(grade.grade / grade.max_points)}%`,
                            }),
                          },
                          {
                            tag: {
                              value: `${grade.grade !== null ? `${grade.grade}/${grade.max_points || 0}` : "NA"}`,
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
                      <Action.Push
                        title="Assignment Details"
                        icon={Icon.Paragraph}
                        target={
                          <Detail
                            markdown={`# ${grade.assignment.title}\n\n${grade.assignment.description}\n\n______________________________\n\n⚠️*Some links and formatting may not show up through Raycast. Please open the assignment in the browser to see the full details.*`}
                            navigationTitle={`${grade.assignment.title} Details`}
                            metadata={
                              <Detail.Metadata>
                                <Detail.Metadata.Label title="Due Date" text={`${grade.assignment.due}`} />
                                <Detail.Metadata.Label
                                  title="Graded Date"
                                  text={new Date(grade.timestamp * 1000).toLocaleString(undefined, {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                />
                                <Detail.Metadata.Label title="Points" text={`${grade.assignment.max_points}`} />
                                <Detail.Metadata.Label
                                  title="Grade"
                                  text={`${grade.grade}/${grade.assignment.max_points} (${(
                                    (grade.grade / grade.assignment.max_points) *
                                    100
                                  )
                                    .toFixed(2)
                                    .replace(/\.?0+$/, "")}%)`}
                                />
                                {grade.comment && <Detail.Metadata.Label title="Comment" text={`${grade.comment}`} />}
                                {category.weight && (
                                  <Detail.Metadata.Label title="Weight" text={`${category.weight}%`} />
                                )}
                                <Detail.Metadata.TagList title="Grading Category">
                                  <Detail.Metadata.TagList.Item text={category.title} color={"#eed535"} />
                                </Detail.Metadata.TagList>
                                <Detail.Metadata.Separator />
                                <Detail.Metadata.Link
                                  title="Web URL"
                                  target={`${grade.web_url}`}
                                  text="Open in Browser"
                                />

                                {grade.assignment.attachments && (
                                  <>
                                    {grade.assignment.attachments.links &&
                                      grade.assignment.attachments.links.link &&
                                      grade.assignment.attachments.links.link.map((link, index) => {
                                        return (
                                          <Detail.Metadata.Link
                                            key={index}
                                            title={`Link ${index + 1}`}
                                            target={link.url}
                                            text={link.title}
                                          />
                                        );
                                      })}
                                    {grade.assignment.attachments.files &&
                                      grade.assignment.attachments.files.file &&
                                      grade.assignment.attachments.files.file.map((file, index) => {
                                        return (
                                          <Detail.Metadata.Link
                                            key={index}
                                            title={`File ${index + 1}`}
                                            target={file.download_path}
                                            text={file.title}
                                          />
                                        );
                                      })}
                                  </>
                                )}
                              </Detail.Metadata>
                            }
                            actions={
                              <ActionPanel>
                                <Action.OpenInBrowser
                                  title="Open in Browser"
                                  icon={Icon.Safari}
                                  url={`${grade.web_url}`}
                                />
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
                        }
                      />
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
