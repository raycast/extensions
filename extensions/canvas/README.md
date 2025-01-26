# Canvas Raycast Extension

Effortlessly connect with Canvas LMS to access courses, assignments, grades, and more directly from Raycast.

### Required Information

This extension requires two preferences to function correctly: the **Institution Domain** and the **Access Token**. Below is a guide on how to retrieve these values.

1.  **Institution Domain**

    - **Description**: The domain of your Canvas institution.
    - **Where to Find**:
      - Navigate to your Canvas in a web browser.
      - The domain is visible in the URL bar, e.g., `https://canvas.mit.com`.
    - **Example**:
      - If your institution URL is `https://canvas.mit.com`, set the `Institution Domain` to `canvas.mit.com`.

2.  **Access Token**

    - **Description**: A personal access token used to authenticate API requests.
    - **How to Create**:
      1.  Log in to your Canvas account.
      2.  Navigate to your **Account Settings**:
          - Click your profile picture or the "Account" link in the left navigation menu.
          - Select **Settings**.
      3.  Scroll to the **Approved Integrations** section.
      4.  Click the **+ New Access Token** button.
      5.  Enter a **purpose** for the token (e.g., "Raycast Extension").
      6.  Set an **expiration date** if desired.
      7.  Click **Generate Token**.
      8.  Copy the generated token (you won't be able to view it again, however you can always create a new one).

---

### Features

#### Implemented

- View course feed and upcoming deadlines.
- Browse courses, their assignments, modules, and announcements.
- Open assignments, modules, and announcements directly in the browser.

#### In Progress

- View the contents of assignments, announcements, and modules inside the extension instead of only opening them in the browser.

#### Planned

- GPA and grades command for quick access to academic performance.

---

### Troubleshooting

- **Invalid Access Token**: Ensure the token is correctly copied and has not expired.
- **Incorrect Institution Domain**: Verify the domain matches the one visible in your Canvas URL.

---

### Disclaimer

- This extension is **not an official Canvas LMS extension**.
- Your data is used solely to interact with your Canvas LMS instance and is never shared or stored externally.
