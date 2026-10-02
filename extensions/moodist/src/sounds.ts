// Generated from https://github.com/remvze/moodist (src/data/sounds)
export type Sound = { id: string; label: string; path: string };
export type Category = { id: string; title: string; sounds: Sound[] };

export const BASE_URL = "https://moodist.mvze.net";

export const categories: Category[] = [
  {
    id: "nature",
    title: "Nature",
    sounds: [
      {
        id: "river",
        label: "River",
        path: "/sounds/nature/river.mp3",
      },
      {
        id: "waves",
        label: "Waves",
        path: "/sounds/nature/waves.mp3",
      },
      {
        id: "campfire",
        label: "Campfire",
        path: "/sounds/nature/campfire.mp3",
      },
      {
        id: "wind",
        label: "Wind",
        path: "/sounds/nature/wind.mp3",
      },
      {
        id: "howling-wind",
        label: "Howling Wind",
        path: "/sounds/nature/howling-wind.mp3",
      },
      {
        id: "wind-in-trees",
        label: "Wind in Trees",
        path: "/sounds/nature/wind-in-trees.mp3",
      },
      {
        id: "waterfall",
        label: "Waterfall",
        path: "/sounds/nature/waterfall.mp3",
      },
      {
        id: "walk-in-snow",
        label: "Walk in Snow",
        path: "/sounds/nature/walk-in-snow.mp3",
      },
      {
        id: "walk-on-leaves",
        label: "Walk on Leaves",
        path: "/sounds/nature/walk-on-leaves.mp3",
      },
      {
        id: "walk-on-gravel",
        label: "Walk on Gravel",
        path: "/sounds/nature/walk-on-gravel.mp3",
      },
      {
        id: "droplets",
        label: "Droplets",
        path: "/sounds/nature/droplets.mp3",
      },
      {
        id: "jungle",
        label: "Jungle",
        path: "/sounds/nature/jungle.mp3",
      },
    ],
  },
  {
    id: "rain",
    title: "Rain",
    sounds: [
      {
        id: "light-rain",
        label: "Light Rain",
        path: "/sounds/rain/light-rain.mp3",
      },
      {
        id: "heavy-rain",
        label: "Heavy Rain",
        path: "/sounds/rain/heavy-rain.mp3",
      },
      {
        id: "thunder",
        label: "Thunder",
        path: "/sounds/rain/thunder.mp3",
      },
      {
        id: "rain-on-window",
        label: "Rain on Window",
        path: "/sounds/rain/rain-on-window.mp3",
      },
      {
        id: "rain-on-car-roof",
        label: "Rain on Car Roof",
        path: "/sounds/rain/rain-on-car-roof.mp3",
      },
      {
        id: "rain-on-umbrella",
        label: "Rain on Umbrella",
        path: "/sounds/rain/rain-on-umbrella.mp3",
      },
      {
        id: "rain-on-tent",
        label: "Rain on Tent",
        path: "/sounds/rain/rain-on-tent.mp3",
      },
      {
        id: "rain-on-leaves",
        label: "Rain on Leaves",
        path: "/sounds/rain/rain-on-leaves.mp3",
      },
    ],
  },
  {
    id: "animals",
    title: "Animals",
    sounds: [
      {
        id: "birds",
        label: "Birds",
        path: "/sounds/animals/birds.mp3",
      },
      {
        id: "seagulls",
        label: "Seagulls",
        path: "/sounds/animals/seagulls.mp3",
      },
      {
        id: "crickets",
        label: "Crickets",
        path: "/sounds/animals/crickets.mp3",
      },
      {
        id: "wolf",
        label: "Wolf",
        path: "/sounds/animals/wolf.mp3",
      },
      {
        id: "owl",
        label: "Owl",
        path: "/sounds/animals/owl.mp3",
      },
      {
        id: "frog",
        label: "Frog",
        path: "/sounds/animals/frog.mp3",
      },
      {
        id: "dog-barking",
        label: "Dog Barking",
        path: "/sounds/animals/dog-barking.mp3",
      },
      {
        id: "horse-gallop",
        label: "Horse Gallop",
        path: "/sounds/animals/horse-gallop.mp3",
      },
      {
        id: "cat-purring",
        label: "Cat Purring",
        path: "/sounds/animals/cat-purring.mp3",
      },
      {
        id: "crows",
        label: "Crows",
        path: "/sounds/animals/crows.mp3",
      },
      {
        id: "whale",
        label: "Whale",
        path: "/sounds/animals/whale.mp3",
      },
      {
        id: "beehive",
        label: "Beehive",
        path: "/sounds/animals/beehive.mp3",
      },
      {
        id: "woodpecker",
        label: "Woodpecker",
        path: "/sounds/animals/woodpecker.mp3",
      },
      {
        id: "chickens",
        label: "Chickens",
        path: "/sounds/animals/chickens.mp3",
      },
      {
        id: "cows",
        label: "Cows",
        path: "/sounds/animals/cows.mp3",
      },
      {
        id: "sheep",
        label: "Sheep",
        path: "/sounds/animals/sheep.mp3",
      },
    ],
  },
  {
    id: "urban",
    title: "Urban",
    sounds: [
      {
        id: "highway",
        label: "Highway",
        path: "/sounds/urban/highway.mp3",
      },
      {
        id: "road",
        label: "Road",
        path: "/sounds/urban/road.mp3",
      },
      {
        id: "ambulance-siren",
        label: "Ambulance Siren",
        path: "/sounds/urban/ambulance-siren.mp3",
      },
      {
        id: "busy-street",
        label: "Busy Street",
        path: "/sounds/urban/busy-street.mp3",
      },
      {
        id: "crowd",
        label: "Crowd",
        path: "/sounds/urban/crowd.mp3",
      },
      {
        id: "traffic",
        label: "Traffic",
        path: "/sounds/urban/traffic.mp3",
      },
      {
        id: "fireworks",
        label: "Fireworks",
        path: "/sounds/urban/fireworks.mp3",
      },
    ],
  },
  {
    id: "places",
    title: "Places",
    sounds: [
      {
        id: "cafe",
        label: "Cafe",
        path: "/sounds/places/cafe.mp3",
      },
      {
        id: "airport",
        label: "Airport",
        path: "/sounds/places/airport.mp3",
      },
      {
        id: "church",
        label: "Church",
        path: "/sounds/places/church.mp3",
      },
      {
        id: "temple",
        label: "Temple",
        path: "/sounds/places/temple.mp3",
      },
      {
        id: "construction-site",
        label: "Construction Site",
        path: "/sounds/places/construction-site.mp3",
      },
      {
        id: "underwater",
        label: "Underwater",
        path: "/sounds/places/underwater.mp3",
      },
      {
        id: "crowded-bar",
        label: "Crowded Bar",
        path: "/sounds/places/crowded-bar.mp3",
      },
      {
        id: "night-village",
        label: "Night Village",
        path: "/sounds/places/night-village.mp3",
      },
      {
        id: "subway-station",
        label: "Subway Station",
        path: "/sounds/places/subway-station.mp3",
      },
      {
        id: "office",
        label: "Office",
        path: "/sounds/places/office.mp3",
      },
      {
        id: "supermarket",
        label: "Supermarket",
        path: "/sounds/places/supermarket.mp3",
      },
      {
        id: "carousel",
        label: "Carousel",
        path: "/sounds/places/carousel.mp3",
      },
      {
        id: "laboratory",
        label: "Laboratory",
        path: "/sounds/places/laboratory.mp3",
      },
      {
        id: "laundry-room",
        label: "Laundry Room",
        path: "/sounds/places/laundry-room.mp3",
      },
      {
        id: "restaurant",
        label: "Restaurant",
        path: "/sounds/places/restaurant.mp3",
      },
      {
        id: "library",
        label: "Library",
        path: "/sounds/places/library.mp3",
      },
    ],
  },
  {
    id: "transport",
    title: "Transport",
    sounds: [
      {
        id: "train",
        label: "Train",
        path: "/sounds/transport/train.mp3",
      },
      {
        id: "inside-a-train",
        label: "Inside a Train",
        path: "/sounds/transport/inside-a-train.mp3",
      },
      {
        id: "airplane",
        label: "Airplane",
        path: "/sounds/transport/airplane.mp3",
      },
      {
        id: "submarine",
        label: "Submarine",
        path: "/sounds/transport/submarine.mp3",
      },
      {
        id: "sailboat",
        label: "Sailboat",
        path: "/sounds/transport/sailboat.mp3",
      },
      {
        id: "rowing-boat",
        label: "Rowing Boat",
        path: "/sounds/transport/rowing-boat.mp3",
      },
    ],
  },
  {
    id: "things",
    title: "Things",
    sounds: [
      {
        id: "keyboard",
        label: "Keyboard",
        path: "/sounds/things/keyboard.mp3",
      },
      {
        id: "typewriter",
        label: "Typewriter",
        path: "/sounds/things/typewriter.mp3",
      },
      {
        id: "paper",
        label: "Paper",
        path: "/sounds/things/paper.mp3",
      },
      {
        id: "clock",
        label: "Clock",
        path: "/sounds/things/clock.mp3",
      },
      {
        id: "wind-chimes",
        label: "Wind Chimes",
        path: "/sounds/things/wind-chimes.mp3",
      },
      {
        id: "singing-bowl",
        label: "Singing Bowl",
        path: "/sounds/things/singing-bowl.mp3",
      },
      {
        id: "ceiling-fan",
        label: "Ceiling Fan",
        path: "/sounds/things/ceiling-fan.mp3",
      },
      {
        id: "dryer",
        label: "Dryer",
        path: "/sounds/things/dryer.mp3",
      },
      {
        id: "slide-projector",
        label: "Slide Projector",
        path: "/sounds/things/slide-projector.mp3",
      },
      {
        id: "boiling-water",
        label: "Boiling Water",
        path: "/sounds/things/boiling-water.mp3",
      },
      {
        id: "bubbles",
        label: "Bubbles",
        path: "/sounds/things/bubbles.mp3",
      },
      {
        id: "tuning-radio",
        label: "Tuning Radio",
        path: "/sounds/things/tuning-radio.mp3",
      },
      {
        id: "morse-code",
        label: "Morse Code",
        path: "/sounds/things/morse-code.mp3",
      },
      {
        id: "washing-machine",
        label: "Washing Machine",
        path: "/sounds/things/washing-machine.mp3",
      },
      {
        id: "vinyl-effect",
        label: "Vinyl Effect",
        path: "/sounds/things/vinyl-effect.mp3",
      },
      {
        id: "windshield-wipers",
        label: "Windshield Wipers",
        path: "/sounds/things/windshield-wipers.mp3",
      },
    ],
  },
  {
    id: "noise",
    title: "Noise",
    sounds: [
      {
        id: "white-noise",
        label: "White Noise",
        path: "/sounds/noise/white-noise.wav",
      },
      {
        id: "pink-noise",
        label: "Pink Noise",
        path: "/sounds/noise/pink-noise.wav",
      },
      {
        id: "brown-noise",
        label: "Brown Noise",
        path: "/sounds/noise/brown-noise.wav",
      },
    ],
  },
  {
    id: "binaural",
    title: "Binaural Beats",
    sounds: [
      {
        id: "binaural-delta",
        label: "Delta",
        path: "/sounds/binaural/binaural-delta.wav",
      },
      {
        id: "binaural-theta",
        label: "Theta",
        path: "/sounds/binaural/binaural-theta.wav",
      },
      {
        id: "binaural-alpha",
        label: "Alpha",
        path: "/sounds/binaural/binaural-alpha.wav",
      },
      {
        id: "binaural-beta",
        label: "Beta",
        path: "/sounds/binaural/binaural-beta.wav",
      },
      {
        id: "binaural-gamma",
        label: "Gamma",
        path: "/sounds/binaural/binaural-gamma.wav",
      },
    ],
  },
];

export const allSounds = categories.flatMap((c) => c.sounds);
