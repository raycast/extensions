# Air Quality

Fetching air quality data from the [World Air Quality Index](https://waqi.info/). See more detail about API [here](https://aqicn.org/api/).

## Getting API Token

To get the API token, you need to register on the [Air Quality Open Data Platform](https://aqicn.org/data-platform/token/) website. After registration, you will get the token.

## Specifying City/Station

By default, the plugin fetches air quality data from the nearest station to your IP location by using a special station named "[here](https://aqicn.org/here)".

You can specify the city or station to get the air quality data by visiting [https://aqicn.org](https://aqicn.org) and searching for the city or station. For example, a valid URL for Bangkok is `https://aqicn.org/city/bangkok/`.

After you have the city or station URL, you can set it in _Command Preferences_.

### Valid formats for city/station configuration

- City: `bangkok`
- Station ID: `@5773`
- URL: `https://aqicn.org/city/bangkok/`
