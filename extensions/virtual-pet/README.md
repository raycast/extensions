# Virtual Pet for Raycast

A virtual pet in your Raycast menu bar. Feed, play with, and care for your virtual companion to keep it happy and healthy.

## Features

- Adopt a virtual pet that lives in your menu bar
- Monitor your pet's status and care for it through various interactions, to keep it happy
- **Fox**, **Red Panda**, **Ferret**, **Pig**, **Cat**, and **Octopus** companions to choose from

## Pet Status

Your pet has five key metrics that affect its overall well-being:

- **Hunger**: Feed your pet to keep it satisfied
- **Happiness**: Play with your pet to keep it happy
- **Energy**: Let your pet rest to recover energy
- **Cleanliness**: Clean your pet to maintain hygiene
- **Health**: Affected by all other stats

## Actions

- **Feed**: Satisfies hunger but slightly decreases cleanliness
- **Play**: Increases happiness but consumes energy and hunger
- **Clean**: Restores cleanliness and slightly boosts happiness
- **Rest**: Puts your pet to sleep for an hour to recover energy
- **Heal**: Boosts health (available once per day when health is low)

## Pet Behavior

- Your pet can fall asleep on its own when very tired
- Status metrics decay over time at different rates
- The pet displays different mood tags based on its status
- Neglect will affect your pet's health and happiness
- Well-cared-for pets show special positive mood states

## TODO

- Add more pet types with unique animations
- Implement pet evolution based on care quality
- Fine-tune and optimize stat changes based on user feedback
- Add actions cooldown to prevent action spamming
- Add more animations for different pet states:
  - Eating animation when fed
  - Playing animation for playtime
  - Cleaning animation
  - Sick animation when health is low
  - Special animations for very happy pets

## Credits

- Pet sprites and animations done by [Elthen](https://www.patreon.com/c/elthen/home)
- Custom icons are from [tabler.io](https://tabler.io/icons)
