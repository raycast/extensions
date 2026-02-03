# Oura Ring

Get data from your [Oura ring experience](https://ouraring.com) to keep track of your readiness, sleep, activity, and more.

---

## Commands

- Get Sleep - Get your sleep score and contributing factors for the last night
- Get Readiness - Get your readiness score based on yesterday's factors
- Get Activity - Get your activity for today
- Get your latest workouts - Get your latest logged activities from Oura; either automatically logged or from outside sources
- Get Stress - Get the last two week's stress data: stress high, recovery high, and day summary.
- Get Resilience - Get the last two week's resilience and contributing factors.
- Info - Get your measurement data from Oura

## Getting set up
In order to get your Oura data directly available in Raycast, follow these steps:
1. Visit [Oura on the web](https://cloud.ouraring.com/user/sign-in).
2. Click the "Developer" icon in the bottom right (it looks like "</>") to open the developer portal.
3. Create a new application and set the Redirect URI to `https://raycast.com/redirect?packageName=Extension`.
4. Copy the Client ID and Client Secret for your new application.
5. Paste those values into the "Oura Client ID" and "Oura Client Secret" fields in this extension's preferences.
6. Run any command to complete the OAuth sign-in flow.

For more details about the API changes see [Oura's documentation](https://cloud.ouraring.com/v2/docs)