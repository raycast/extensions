// const handleSubmit = async (values: Values) => {
//   const { projectId, sourceBranch, targetBranch, title, description } = values;

//   try {
//     const requestBody = {
//       id: projectId,
//       source_branch: sourceBranch,
//       target_branch: targetBranch,
//       title: title,
//       description: description,
//     };

//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     const response: any = await axios.post(
//       `https://gitlab.ghfkj.cn/api/v4/projects/${projectId}/merge_requests`,
//       requestBody,
//       {
//         headers: {
//           "Content-Type": "application/json",
//           "PRIVATE-TOKEN": "glpat-Vgje15-3a-z6ohUZaRvz",
//         },
//       },
//     );

//     console.log(response, "response---");
//     if (response.status === 201) {
//       // Merge request created successfully
//       console.log("Merge request created:", response.data.web_url);
//     } else {
//       // Handle other response statuses
//       console.error("Error creating merge request:", response.status, response.data);
//     }
//   } catch (error) {
//     if (error.response) {
//       // The request was made and the server responded with a status code
//       // that falls out of the range of 2xx
//       console.error("Error creating merge request:", error.response.status, error.response.data);
//     } else if (error.request) {
//       // The request was made but no response was received
//       console.error("No response received from server:", error.request);
//     } else {
//       // Something happened in setting up the request that triggered an error
//       console.error("Error creating merge request:", error.message);
//     }
//   }
// };
