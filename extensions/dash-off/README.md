<p align="center">
   <img src="https://github.com/raycast/extensions/assets/372831/ff641a3a-60c1-42a7-b510-80bb5846bb82">
 </p>

The fastest way to dash off a quick email to yourself and others.

## How to get a Gmail OAuth Client ID

You need to create your own OAuth Client ID to be able to use this extension.

- Go to [Google Developers Console](https://console.developers.google.com)

  ⚠️ Make sure that you logged in with the Google Account which will be associated with your new OAuth key

- Create a project and named it e.g. `Raycast Dash Off`

- Enable the `Gmail API`

  1. Open the [APIs Library](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
  2. Click the `Enable` button

- Setup OAuth

  1. Open the [API Dashboard](https://console.cloud.google.com/apis/dashboard)
  2. Click on `OAuth consent screen` on the left side
  3. Check `External` and click `Create`
  4. In `App Name` type `Raycast Dash Off`
  5. In `User Support Mail` and in `Developer Contact Info` type/select your own email address
  6. Press `Save and Continue`

- Create Credentials
  1. Click on `Credentials` on the left panel
  2. Click on the `Create Credentials` on the top
  3. Press `OAuth client ID`
  4. In `Application Type` choose `iOS`
  5. In `Name` type `Raycast Dash Off`
  6. In `Bundle ID` type `com.raycast`
  7. Press `Create`
  8. Copy and paste the shown Client ID into the Preferences of this extension

Now you should be able to send emails from Gmail with Raycast.
