import { runAppleScript } from "@raycast/utils";
import { getPreferenceValues, Clipboard, LocalStorage } from "@raycast/api";
import SchoologyAPI from "schoologyapi"; // Import your API client

const preferences = getPreferenceValues();
const client = new SchoologyAPI(preferences.key, preferences.secret);

export default async function showNotifications() {
  async function displayNotification(courseTitle, assignmentTitle) {
    await runAppleScript(
      `
            display notification "Assignment: ${assignmentTitle}" with title "Grade Update - ${courseTitle}"
            `
    );
  }

  try {
    const users_response = await client.request("GET", "/app-user-info");
    const uid = users_response.api_uid.toString();

    const course_response = await client.request("GET", `/users/${uid}/sections`);
    const course_data = await course_response;

    await Promise.all(
      course_data.section.map(async (course) => {
        try {
          const id = course.id;
          const courseTitle = course.course_title;

          // Get the maxTimestamp for this course from LocalStorage
          let maxTimestamp = Number(await LocalStorage.getItem(`maxTimestamp_${id}`)) || 0;

          // Fetch the grades for this course
          const grades_response = await client.request("GET", `/users/${uid}/grades/?section_id=${id}`);
          console.log("Grades response:", JSON.stringify(grades_response));

          if (
            grades_response &&
            grades_response.section &&
            grades_response.section.length > 0 &&
            grades_response.section[0].final_grade &&
            grades_response.section[0].final_grade.length > 1
          ) {
            let latestTimestamp = 0;

            // Iterate over all periods of this section
            for (const period of grades_response.section[0].period) {
              // Iterate over the assignments for this period
              for (const assignment of period.assignment) {
                const timestamp = Number(assignment.timestamp) * 1000;

                // Fetch the assignment details
                const assignmentDetailsResponse = await client.request(
                  "GET",
                  `/sections/${id}/grade_items/${assignment.assignment_id}?with_attachments=true`
                );
                console.log("Assignment details response:", assignmentDetailsResponse);
                const assignmentTitle = assignmentDetailsResponse.title;

                // Update the maxTimestamp for this course if this timestamp is greater
                if (timestamp > maxTimestamp) {
                  maxTimestamp = timestamp;

                  // Store the updated maxTimestamp for this course in LocalStorage
                  await LocalStorage.setItem(`maxTimestamp_${id}`, maxTimestamp.toString());
                  console.log("Updated maxTimestamp for course:", id, "to:", maxTimestamp);

                  // Display a notification for this assignment
                  console.log("Sending notification for course:", courseTitle, "and assignment:", assignmentTitle);
                  displayNotification(courseTitle, assignmentTitle);
                  Clipboard.copy(JSON.stringify(grades_response), true);
                }

                // Update the latest timestamp for this course if this assignment's timestamp is more recent
                if (timestamp > latestTimestamp) {
                  latestTimestamp = timestamp;
                }
              }
            }

            return { id, courseTitle, latestTimestamp };
          }
        } catch (error) {
          console.error(`Failed to fetch grade for course ${course.course_title}: ${error}`);
        }
      })
    );
  } catch (error) {
    console.error(error);
  }
}
