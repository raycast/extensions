import { Form, ActionPanel, Action, showToast, Toast} from "@raycast/api";
import axios from 'axios';
type Values = {
  issuetitle: string;
  issuefield: string;
  userfield: string;
  issuetype: string;
  usercontribution: string;
  proposedsolution: string;
  keyfield: string;
};

export default function Command() {
  let entry = { 
    "title": {
        "title": [
            {
                "text": {
                    "content": ""
                }
            }
        ]
    },
    "issue description": {
      "rich_text": [
          {
              "text": {
                  "content": ""
              }
          }
      ]
  },
  "entered by:": {
    "rich_text": [
        {
            "text": {
                "content": ""
            }
        }
    ]
},
"issue type": {
    "select": {
      "name": ""
    }
},
"what i did to contribute to the issue": {
  "rich_text": [
      {
          "text": {
              "content": ""
          }
      }
  ]
},
"proposed solution": {
  "rich_text": [
      {
          "text": {
              "content": ""
          }
      }
  ]
},
"Status": {
  "select": {
    "name": "needs review"
  }
},
  }

  const options = {
    method: 'POST',
    url: 'https://api.notion.com/v1/pages',
    headers: {
      accept: 'application/json',
      'Notion-Version': '2022-06-28',
      'content-type': 'application/json',
      Authorization: ''
    },
    data: {parent: {
      "type": "database_id",
      "database_id": "2d3d9b6cc72f4cb880c7adc3d76e8c4e"
  }, properties: entry}
  };


  function handleSubmit(values: Values) {
    entry.title.title[0].text.content = values.issuetitle
    entry["issue description"].rich_text[0].text.content = values.issuefield
    entry["entered by:"].rich_text[0].text.content = values.userfield
    entry["issue type"].select.name = values.issuetype
    entry["what i did to contribute to the issue"].rich_text[0].text.content = values.usercontribution
    entry["proposed solution"].rich_text[0].text.content = values.proposedsolution

    options.headers.Authorization = 'Bearer ' + values.keyfield
    axios
  .request(options)
  .then(function () {
    showToast({ style: Toast.Style.Success,  title: "Issue report has been submitted successfully."});
  })
  .catch(function () {
    showToast({  style: Toast.Style.Failure, title: "There was an error submitting the issue. Please ensure that you are using the correct integration key."});
  });
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Issue Report Form" />
      <Form.TextField id="issuetitle" title="Issue Title" />
      <Form.TextField id="issuefield" title="Issue Description" placeholder="Describe the issue" />
      <Form.TextField id="userfield" title="Username" placeholder="Enter your username" storeValue />
      <Form.Dropdown id="issuetype" title="Issue Type">
        <Form.Dropdown.Item value="type 1 - take action" title="Take Action" />
        <Form.Dropdown.Item value="type 2 - escalate" title="Escalate" />
      </Form.Dropdown>
      <Form.TextField id="usercontribution" title="Your Contribution" placeholder="What I did to work on the issue"  />
      <Form.TextField id="proposedsolution" title="Proposed Solution" placeholder="How would this issue be solved"  />
      <Form.Separator />
      <Form.TextField id="keyfield" title="Integration Key" placeholder="Enter the Notion integration key" storeValue />
    </Form>
  );
}
