# Goodlinks 2 Extension for Raycast

<p align="center">
  <img src="assets/goodlinks.png" alt="Goodlinks Icon" width="200"/>
</p>

<p align="center">
  <a href="https://shields.io"><img src="https://img.shields.io/badge/built%20with-JavaScript-blue"></a>
  <a href="https://shields.io"><img src="https://img.shields.io/badge/built%20with-TypeScript-blue"></a>
  <a href="https://shields.io"><img src="https://img.shields.io/badge/built%20with-React-blue"></a>
  <a href="https://shields.io"><img src="https://img.shields.io/badge/built%20with-Node.js-blue"></a>
  <a href="https://shields.io"><img src="https://img.shields.io/badge/built%20with-Raycast%20API-blue"></a>
</p>

## Add to Your Raycast
_Coming Soon_

## Download GoodLinks

[![GoodLinks for macOS](https://img.shields.io/badge/Download%20on%20the%20Mac%20App%20Store-0078D6?style=for-the-badge&logo=apple&logoColor=white)](https://apps.apple.com/us/app/goodlinks/id1474335294?mt=12)
[![GoodLinks for iOS](https://img.shields.io/badge/Download%20on%20the%20App%20Store-0D96F6?style=for-the-badge&logo=apple&logoColor=white)](https://apps.apple.com/us/app/goodlinks/id1474335294)

## Previews

<p align="center">
  <img src="/assets/preview1.png" alt="Launching Extension" width="600"/>
  <br>
  <em>Launching Extension</em>
</p>

<p align="center">
  <img src="/assets/preview2.png" alt="Add from Clipboard" width="600"/>
  <br>
  <em>Add from Clipboard</em>
</p>

<p align="center">
  <img src="/assets/preview3.png" alt="Manage Links (in development)" width="600"/>
  <br>
  <em>Manage Links (in development)</em>
</p>


## Manual Use Instructions

### 1. Fork and Clone the Repository
To begin, fork this repository and clone it to your local machine:

```bash
git clone https://github.com/your-username/goodlinks_raycast.git
cd goodlinks_raycast
```

### 2. Install Dependencies
Ensure you have [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed. Then, install the necessary dependencies:

```bash
npm install
```

### 3. Import Extension Locally in Raycast
To test the extension locally, follow these steps:

1. Open Raycast and go to **Extensions**.
2. Click on the **Import Extension** button.
3. Navigate to the cloned repository and select the extension.

### 4. Deploy the Extension
Once you're ready to deploy the extension, use the following command:

```bash
ray deploy
```

---

### Warnings and Additional Notes

**Note**: Ensure you have the Raycast CLI installed and configured. You can refer to the [Raycast Developer Documentation](https://developers.raycast.com/) for more details on setting up and using the Raycast CLI.

- **Forking and Cloning**: If you encounter issues while forking and cloning the repository, make sure your SSH keys are correctly configured with your GitHub account. You can follow GitHub's [SSH documentation](https://docs.github.com/en/authentication/connecting-to-github-with-ssh) for more guidance.
- **Dependencies**: Always verify that you have the correct versions of Node.js and npm installed to avoid compatibility issues. You can check your versions by running `node -v` and `npm -v`.
- **Local Testing**: When testing the extension locally, ensure that Raycast is correctly set up on your machine. You may need to adjust permissions or settings for the extension to function properly.
- **Deployment**: Use `ray deploy` cautiously. This command will deploy the extension to your Raycast environment, making it available for use. Double-check your configuration and code before deploying to prevent issues.

Feel free to contribute and enhance this extension! If you encounter any issues, please open an issue in this repository. Contributions are welcome, whether they are bug fixes, feature additions, or documentation improvements.
