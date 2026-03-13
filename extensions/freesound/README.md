# Freesound

Search Sounds on [Freesound](https://freesound.org/).

## Authentication

- Create an account on [Freesound](https://freesound.org/).
- Go to the [API settings page](https://freesound.org/apiv2/apply/) and create an API key.
- Copy the API key (marked as `Client secret/Api key`) and paste it into your setting

## Supported Actions

- Search Sounds
- Show Sound details
- Listen to a preview of a sound
- Show User details

## TODO

> Currently it is not possible to directly download the sound from this extension (due to unclear OAuth2 implementation). You can download the sound from the page (open it in your browser)

- [ ] Add OAuth2 support
- [ ] Add download action
- [ ] Option to kill any sound that is playing when the extension is closed (currently not possible due to limitations in the Raycast API)
