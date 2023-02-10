<p align="center">
<img width=180 src="https://raw.githubusercontent.com/raycast/extensions/08e658302c225c17cf9af4ebd4073e22f57ca279/extensions/tuya-smart/assets/tuya-logo.png">
 <h2 align="center">Tuya Smart</h2>
</p>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#built-with">Prerequisites</a></li>
    <li><a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#create-a-project">Create a project</a></li>
        <li><a href="#link-devices-by-app-account">Link Devices by App Account</a></li>
        <li><a href="#get-authorization-key">Get authorization key</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
  </ol>
</details>

---

## Prerequisites

- Your devices need first to be added in the [Tuya Smart or Smart Life app][tuya-smart-url].
- You will also need to create an account in the [Tuya IoT Platform][tuya-iot-url]. This is a separate account from the one you made for the app. You cannot log in with your app’s credentials.

## Create a Project

1. Log in to the [Tuya IoT Platform][tuya-iot-url]
2. In the left navigation bar, click `Cloud` > `Development`.
3. On the page that appears, click `Create Cloud Project`.
4. In the `Create Cloud Project` dialog box, configure `Project Name`, `Description`, `Industry`, adn `Data Center`. For the `Development` Method field, select `Smart Home` from the dropdown list. For the `Data Center` field, select the zone your are located in. Refer to country/data center mapping list [here][data-center-mappings-url]
   <img src="https://raw.githubusercontent.com/raycast/extensions/8a356b6f2f352065a45eccfaa7ac24159406e59e/extensions/tuya-smart/assets/Create_Cloud_Project_Dialog_box.png">
5. Click `Create` to continue with the project configuration.
6. In Configuration Wizard, make sure you add `Device Status Notification API`. The list of API should look like this:
   <img src="https://raw.githubusercontent.com/raycast/extensions/6824b503ce9b92e2a749b481043b30bcd8254108/extensions/tuya-smart/assets/Authorize_API_Services_Dialog_box.png">
7. Click `Authorize`.

## Link Devices by App Account

1. Navigate to the `Devices` tab.
2. Click `Link Tuya App Account` > `Add App Account`.
   <img src="https://raw.githubusercontent.com/raycast/extensions/6824b503ce9b92e2a749b481043b30bcd8254108/extensions/tuya-smart/assets/add_app_account.png">
3. Scan the QR code that appears using the `Tuya Smart` app or `Smart Life` app.
   <img src="https://raw.githubusercontent.com/raycast/extensions/6824b503ce9b92e2a749b481043b30bcd8254108/extensions/tuya-smart/assets/app_qr.png">
4. Click `Confirm` in the app.
5. To confirm that everything worked, navigate to the `All Devices` tab. Here you should be able to find the devices from the app.
   <img src="https://raw.githubusercontent.com/raycast/extensions/6824b503ce9b92e2a749b481043b30bcd8254108/extensions/tuya-smart/assets/all_devices.png">
6. If zero devices are imported, try changing the DataCenter and check the account used is the “Home Owner”. You can change DataCenter by clicking the Cloud icon on the left menu, then clicking the Edit link in the Operation column for your newly created project. You can change DataCenter in the popup window.

## Get Authorization Key

Click the created project to enter the `Project Overview` page and get the `Authorization Key`. You will need these for setting up the integration. in the next step.
<img src="https://github.com/AndresMorelos/raycast-extensions/blob/tuya-smart-extension/extensions/tuya-smart/assets/auth_key.png?raw=true">

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[tuya-smart-url]: https://developer.tuya.com/en/docs/iot/tuya-smart-app-smart-life-app-advantages?id=K989rqa49rluq#title-1-Download
[tuya-iot-url]: https://iot.tuya.com/
[data-center-mappings-url]: https://github.com/tuya/tuya-home-assistant/blob/main/docs/regions_dataCenters.md
