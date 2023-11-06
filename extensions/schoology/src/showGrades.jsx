import { ActionPanel, Action, Icon, List, getPreferenceValues, Color, showToast, Toast, popToRoot } from "@raycast/api";
import SchoologyAPI from "schoologyapi";
import { useEffect, useState } from "react";

const preferences = getPreferenceValues();
const client = new SchoologyAPI(preferences.key, preferences.secret);

export default function Command() {
  const [coursesText, setCoursesText] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [gradesArr, setGradesArr] = useState([]);
  const [coursesHashmap2, setCoursesHashmap2] = useState({});
  const [coursesIconHashmap2, setCoursesIconHashmap2] = useState({});

  useEffect(() => {
    const fetchCoursesText = async () => {
      try {
        const users_response = await client.request("GET", "/app-user-info");
        const users_data = await users_response;
        const uid = users_response.api_uid.toString();

        const user_grades = await client.request("GET", `/users/${uid}/grades`);
        const user_grades_data = await user_grades;
        const finalGradesSet = new Set();

        user_grades_data.section.forEach((section) => {
          section.final_grade.forEach((gradeObj) => {
            finalGradesSet.add(gradeObj.grade);
          });
        });

        const finalGrades = Array.from(finalGradesSet);
        setGradesArr(finalGrades);

        const course_response = await client.request("GET", `/users/${uid}/sections`);
        const course_data = await course_response;
        const courses_sections = course_data.section.map((course) => course.id);

        const coursesHashmap = {};
        const coursesIconHashmap = {};

        course_data.section.forEach((course, index) => {
          coursesHashmap[courses_sections[index]] = course.course_title;
          coursesIconHashmap[courses_sections[index]] = course.subject_area;
        });

        setCoursesIconHashmap2(coursesIconHashmap);
        setCoursesHashmap2(coursesHashmap);

        const course_grades = await client.request("GET", `/users/${uid}/grades`);
        const course_grades_data = await course_grades;
        const course_grades_ids = course_grades_data.section.map((course) => course.section_id);

        setCoursesText(course_grades_ids);
      } catch (error) {
        popToRoot();
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid Schoology API key and/or secret",
          message:
            "Head to [district].schoology.com/api and paste in your newly generated key and secret into this extension's preferences.",
        });
        setCoursesText([]);
      }
    };

    fetchCoursesText();
  }, []);

  function getLetterGrade(percentageGrade) {
    if (percentageGrade >= 97) return "A+";
    else if (percentageGrade >= 93) return "A";
    else if (percentageGrade >= 90) return "A-";
    else if (percentageGrade >= 87) return "B+";
    else if (percentageGrade >= 83) return "B";
    else if (percentageGrade >= 80) return "B-";
    else if (percentageGrade >= 77) return "C+";
    else if (percentageGrade >= 73) return "C";
    else if (percentageGrade >= 70) return "C-";
    else if (percentageGrade >= 67) return "D+";
    else if (percentageGrade >= 63) return "D";
    else if (percentageGrade >= 60) return "D-";
    else return "F";
  }

  function getColorBasedOnGrade(letterGrade) {
    switch (letterGrade) {
      case "A+":
      case `A`:
      case "A-":
        return Color.Green;
      case "B":
      case "B+":
      case "B-":
        return Color.Blue;
      case "C+":
      case "C-":
      case "C":
        return Color.Orange;
      case "D-":
      case "D+":
      case "D":
        return Color.Red;
      case "F":
        return Color.Gray;
      default:
        return Color.PrimaryText;
    }
  }

  function getIconBasedOnNumber(number) {
    switch (number) {
      case "0":
        return Icon.SquareEllipsis;
      case "1":
        return Icon.SoccerBall;
      case "2":
        return Icon.QuoteBlock;
      case "3":
        return Icon.PlusMinusDivideMultiply;
      case "4":
        return Icon.TwoPeople;
      case "5":
        return Icon.Leaf;
      case "6":
        return Icon.Book;
      case "7":
        return Icon.Cog;
      case "8":
        return Icon.ComputerChip;
      default:
        return Icon.Brush;
    }
  }

  return (
    <List navigationTitle="Show Grades" searchBarPlaceholder="Search your courses" isLoading={coursesText.length === 0}>
      {coursesText
        .filter((course) => course.includes(searchText))
        .map((course) => (
          <List.Item
            title={coursesHashmap2[course] || course}
            icon={getIconBasedOnNumber(coursesIconHashmap2[course]) || Icon.Text}
            accessories={[
              {
                tag: {
                  value: getLetterGrade(gradesArr[coursesText.indexOf(course)]),
                  color: getColorBasedOnGrade(getLetterGrade(Number(gradesArr[coursesText.indexOf(course)]))),
                },
              },

              { text: `${gradesArr[coursesText.indexOf(course)] + "%"}` },
            ]}
            actions={
              <ActionPanel>
                <Action.Paste
                  title="Paste Grade"
                  content={`${coursesHashmap2[course]}:\nPercentage: ${gradesArr[coursesText.indexOf(course)]}%`}
                />

                <Action.CopyToClipboard
                  title="Copy Grade"
                  content={`${coursesHashmap2[course]}:\nPercentage: ${gradesArr[coursesText.indexOf(course)]}%`}
                />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
