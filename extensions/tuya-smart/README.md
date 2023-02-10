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
        <li><a href="#prerequisites">Create a project</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
  </ol>
</details>

## Prerequisites

- Your devices need first to be added in the [Tuya Smart or Smart Life app][tuya-smart-url].
- You will also need to create an account in the [Tuya IoT Platform][tuya-iot-url]. This is a separate account from the one you made for the app. You cannot log in with your app’s credentials.

## Create a Project

1. Log in to the [Tuya IoT Platform][tuya-iot-url]
2. In the left navigation bar, click `Cloud` > `Development`.
3. On the page that appears, click `Create Cloud Project`.
4. In the `Create Cloud Project` dialog box, configure `Project Name`, `Description`, `Industry`, adn `Data Center`. For the `Development` Method field, select `Smart Home` from the dropdown list. For the `Data Center` field, select the zone your are located in. Refer to country/data center mapping list [here][data-center-mappings-url]
   <img width=180 src="https://raw.githubusercontent.com/raycast/extensions/08e658302c225c17cf9af4ebd4073e22f57ca279/extensions/tuya-smart/assets/Create_Cloud_Project_Dialog_box.png">

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->

[tuya-smart-url]: https://developer.tuya.com/en/docs/iot/tuya-smart-app-smart-life-app-advantages?id=K989rqa49rluq#title-1-Download
[tuya-iot-url]: https://iot.tuya.com/
[data-center-mappings-url]: https://github.com/tuya/tuya-home-assistant/blob/main/docs/regions_dataCenters.md
