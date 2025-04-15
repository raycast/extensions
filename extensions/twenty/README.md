<h1 align="left"> 🔥 Twenty Raycast Extension </h1>

Twenty simplifies CRM management, empowering businesses to enhance productivity and drive growth. With this Raycast extension, record creation across standard and custom objects is now at your fingertips, making your workflow effortless and efficient. Experience how easy it is to use this Raycast for seamless record creation!

## ⚡️ Create records instantly across Standard and Custom Objects!

## 📝 Command Descriptions

### <i>Create Object Record</i>

With `Create Object Record` command, effortlessly create records in any standard or custom object. Search command press Enter to see active objects, then press `CMD + Enter` to unveil a form that fills in your record seamlessly into the CRM table — making CRM magic happen!

---

## 🚀 Getting Started

Get your API Keys from [twenty developer settings](https://twenty.com/settings/developers) , navigate to Raycast Command settings or try to access command which will open up view to provide your API key.

<table>
  <tr>
  <td><img src="https://github.com/user-attachments/assets/7787e53b-c08a-4491-a66f-9d738195a2af" alt="Twenty Api Token View" /></td>
  </tr>
</table>

if you are selfhost user navigate to `<self-host-url>/settings/developers`, once you have your key, go to Raycast Command Settings to provide your `selfhost api url` and `API key`. If you don't provide selfhost url, extension will assume [https://api.twenty.com](https://api.twenty.com) as your instance.

<table>
  <tr>
    <td><img src="https://github.com/user-attachments/assets/191dc74b-4856-49ba-8656-fc5668de98fb" alt="Raycast Settings"/></td>
  </tr>
</table>

---

## 📘 User Guide

To use the extension, search for the `Create Object Record` command, which will display all your `active` standard and custom objects currently in your twentyCRM. Its very flexible - if you create new objects or deactivate existing ones, this will automatically reflect those changes.

https://github.com/user-attachments/assets/fca0f71d-3c04-43ad-afb4-4e5b0a9d4d13

When you deactivate any standard or custom object, it will no longer appear, ensuring you only see the information and objects you want to access. This makes the extension extensible and enhances your productivity.

https://github.com/user-attachments/assets/f357b91b-dd2e-4043-af8c-9328235c0aa8

If you create new custom objects, they will appear, allowing you to quickly create your records instantly from Raycast.

https://github.com/user-attachments/assets/f0d8fa96-468b-42e4-a11c-a9e4a47ce412

To create a record for any object, select your target object and press `ENTER`. This will open a form that matches the exact table schema you created in your CRM, following any validations it suggests to successfully create your record by pressing `CMD + ENTER`. Records cannot be created with an empty first column (such as Name, Title, etc.).

https://github.com/user-attachments/assets/6f8d7127-63a6-4113-ac6a-5ea3003c5f0c

Similar to creation of standard object record you can create custom objects record

https://github.com/user-attachments/assets/098e120c-ac58-4f41-9560-2782c798d6bd

If you want to create multiple records for the same object without closing the form after each one, go to the Raycast command settings and check the option to `keep object form open after record creation`.

<table>
  <tr>
  <td><img src="https://github.com/user-attachments/assets/aed74a0e-74b5-4b6c-9a3d-7ce03fbe3d6f" alt="Create Object Form Behaviour" /></td>
  </tr>
</table>

https://github.com/user-attachments/assets/8d87ca8e-c7b2-4962-b427-947220bcbb86

It's much more flexible—similar to objects, if you deactivate any fields, they will no longer appear in your object schema during record creation.

https://github.com/user-attachments/assets/2686c7c0-dfde-4445-93be-17d10cf22d60

No worries! If you add or update any fields in your standard objects, they will automatically appear in your object schema form in Raycast, looking closely you will see, if you add a select field with a default value provided some icon, it will display exactly what you’ve set when creation.

https://github.com/user-attachments/assets/697da72b-1ca2-4493-b61c-d393b77b34f6

## 🧑‍💻 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue.
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feat/AmazingFeature`)
3. Install Dependency (`npm install`) & follow getting started guide for api key.
4. Commit your Changes (`git commit -m 'feat: adds some amazing feature'`)
5. Push to the Branch (`git push origin feat/AmazingFeature`)
6. Open a Pull Request

## 💬 Connect With Me

<div align="center">

| **Name**    | Nabhag Motivaras                                  |
| :---------- | :------------------------------------------------ |
| **Twitter** | [@NabhagMotivaras](https://x.com/NabhagMotivaras) |

</div>

## 🤝 Support my work

If you love my work and would like to support me, consider becoming a [GitHub sponsor](https://github.com/sponsors/Nabhag8848)

## 🛣️ Roadmap

- [x] Currently we support `FULL_NAME`, `TEXT`, `LINKS`, `EMAILS`, `SELECT`.
- [x] Supporting other fields are easy as we have build the foundation and its quite similar to what we have already build.
- [ ] PHONE_NUMBER, CURRENCY similar to LINKS
- [ ] RATING (1, 2, 3, 4, 5 as option), BOOLEAN (True or False as option), MULTI_SELECT are similar to SELECT
- [ ] RELATION Similar to SELECT but requires additional work but doable
- [ ] support seeing records of all objects
