<p align="center">
    <img src="./assets/umami.png" width="150" height="150" />
</p>

# Umami

This is a Raycast extension for [Umami](https://umami.is/) - _The modern analytics platform for effortless insights_.

## ⚙️ Configuration

This extension supports both "Umami Cloud" and "Umami Self-Hosted".

### Cloud

| Preference | Comment |
|------------|---------|
| Umami Endpoint | Use the default `https://api.umami.is/v1` |
| Umami API Key (Cloud) | Create this in your Dashboard |

### Self-Hosted

| Preference | Comment |
|------------|---------|
| Umami Endpoint | The URL of your Umami instance including "api" e.g. `https://umami.example.com/api/` |
| Umami User ID (Self-Hosted) | The ID of the User performing the API calls |
| Umami Client Secret (Self-Hosted) | A random string used to generate unique values. This needs to match the APP_SECRET used in the Umami application. |

> For now, the extension shows you your sites with the last 24 hours of stats