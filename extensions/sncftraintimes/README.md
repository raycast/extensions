# SncfTrainTimes

Fetch train times for SNCF train lines.

As you may know, SNCF is not very trustable when it comes to train times. This tool will help you to know if your train is on time or not without using the SNCF Connect app.

<br/>

**Be aware that sometimes the API doesn't return a delay for a train, even if the SNCF Connect app does. I don't know why.**

<br/>

## Functionalities

- Add multiple journeys (departure station, arrival station)
- List journeys
  - Get 5 next trains for each journey
    - Get details for each train (departure time, arrival time, delay, etc.)

## Requirements

- SCNF API key (https://www.digital.sncf.com/startup/api)
  - It's a 5 minutes process, you just need to give your email address and a name and you'll receive your API key just after

<br/>

Made by [Vasseur Pierre-Adrien](https://github.com/Pierrad)