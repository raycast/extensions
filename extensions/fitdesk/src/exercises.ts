export type ExerciseType = "reps" | "time";

export type Category = "upper" | "core" | "lower" | "cardio" | "full-body";

export interface Exercise {
  id: string;
  name: string;
  category: Category;
  type: ExerciseType;
  amount: number; // reps or seconds
  description: string;
  tips: string[];
  gif?: string;
}

export const categoryLabels: Record<Category, string> = {
  upper: "Upper Body",
  core: "Core",
  lower: "Lower Body",
  cardio: "Cardio",
  "full-body": "Full Body",
};

export const categoryIcons: Record<Category, string> = {
  upper: "💪",
  core: "🎯",
  lower: "🦵",
  cardio: "❤️",
  "full-body": "🔥",
};

export const exercises: Exercise[] = [
  // UPPER BODY
  {
    id: "pushups",
    name: "Push-ups",
    category: "upper",
    type: "reps",
    amount: 15,
    description: "Classic push-ups with hands at shoulder width",
    tips: [
      "Keep your body straight like a plank",
      "Lower until your chest nearly touches the floor",
      "If too hard, do them on your knees",
    ],
    gif: "https://media.giphy.com/media/kYvaNlsFBgq3xZ8fRn/giphy.gif",
  },
  {
    id: "incline-pushups",
    name: "Incline Push-ups",
    category: "upper",
    type: "reps",
    amount: 15,
    description: "Push-ups with hands on a desk or chair",
    tips: [
      "Great for beginners",
      "The more vertical, the easier",
      "Keep elbows close to your body",
    ],
    gif: "https://media.giphy.com/media/2yuPBGrg5DagENk59X/giphy.gif",
  },
  {
    id: "tricep-dips",
    name: "Tricep Dips",
    category: "upper",
    type: "reps",
    amount: 12,
    description: "Dips using a chair or desk for support",
    tips: [
      "Keep your back close to the chair",
      "Lower until elbows form 90 degrees",
      "Don't let shoulders rise to your ears",
    ],
    gif: "https://media.giphy.com/media/wKdb2xwADyl3hQZmZh/giphy.gif",
  },
  {
    id: "diamond-pushups",
    name: "Diamond Push-ups",
    category: "upper",
    type: "reps",
    amount: 10,
    description: "Push-ups with hands together forming a diamond",
    tips: [
      "Touch thumbs and index fingers together",
      "Works triceps more",
      "Keep elbows close to your body",
    ],
    gif: "https://media.giphy.com/media/JZPaw2Y2oENHcZrHja/giphy.gif",
  },
  {
    id: "wide-pushups",
    name: "Wide Push-ups",
    category: "upper",
    type: "reps",
    amount: 12,
    description: "Push-ups with hands wider than shoulder width",
    tips: ["Works chest more", "Keep core tight", "Don't let hips drop"],
    gif: "https://media.giphy.com/media/7YCC7PTNX2TOhJQ6aW/giphy.gif",
  },

  // CORE
  {
    id: "plank",
    name: "Plank",
    category: "core",
    type: "time",
    amount: 45,
    description: "Hold plank position on your forearms",
    tips: [
      "Body in a straight line from head to heels",
      "Squeeze glutes and abs",
      "Don't let hips drop",
    ],
    gif: "https://media.giphy.com/media/ZcteOOkovIh9HaVFjT/giphy.gif",
  },
  {
    id: "crunches",
    name: "Crunches",
    category: "core",
    type: "reps",
    amount: 20,
    description: "Classic crunches lying on your back",
    tips: [
      "Don't pull on your neck with hands",
      "Exhale as you go up",
      "Controlled movement, don't use momentum",
    ],
    gif: "https://media.giphy.com/media/d4bnhtIfWQQt8qv6/giphy.gif",
  },
  {
    id: "mountain-climbers",
    name: "Mountain Climbers",
    category: "core",
    type: "time",
    amount: 30,
    description: "From plank position, alternate bringing knees to chest",
    tips: ["Keep hips low", "Steady pace", "Core always engaged"],
    gif: "https://media.giphy.com/media/VzlPEkuoqlgjehxvxk/giphy.gif",
  },
  {
    id: "side-plank",
    name: "Side Plank",
    category: "core",
    type: "time",
    amount: 30,
    description: "Side plank on one forearm",
    tips: [
      "Keep hips high, don't let them drop",
      "Do both sides",
      "Can rest bottom knee if too difficult",
    ],
    gif: "https://media.giphy.com/media/jpL8gAOyUasNPHHASL/giphy.gif",
  },
  {
    id: "leg-raises",
    name: "Leg Raises",
    category: "core",
    type: "reps",
    amount: 15,
    description: "Lying on your back, raise legs together",
    tips: [
      "Keep lower back pressed to the floor",
      "Lower slowly and controlled",
      "Can bend knees slightly",
    ],
    gif: "https://media.giphy.com/media/mVpOJcNBGPwzlfkTxJ/giphy.gif",
  },
  {
    id: "russian-twists",
    name: "Russian Twists",
    category: "core",
    type: "reps",
    amount: 20,
    description: "Seated with feet raised, rotate torso side to side",
    tips: [
      "Keep back straight",
      "Feet don't touch the floor",
      "Rotate from the core, not just arms",
    ],
    gif: "https://media.giphy.com/media/cpKD9u3S25xYL8tcbr/giphy.gif",
  },

  // LOWER BODY
  {
    id: "squats",
    name: "Squats",
    category: "lower",
    type: "reps",
    amount: 20,
    description: "Bodyweight squats",
    tips: [
      "Knees in line with feet",
      "Lower until thighs are parallel to floor",
      "Keep chest up",
    ],
    gif: "https://media.giphy.com/media/1qfKN8Dt0CRdCRxz9q/giphy.gif",
  },
  {
    id: "lunges",
    name: "Lunges",
    category: "lower",
    type: "reps",
    amount: 12,
    description: "Alternating lunges",
    tips: [
      "Back knee almost touches the floor",
      "Front knee doesn't go past toes",
      "Keep torso upright",
    ],
    gif: "https://media.giphy.com/media/ddR8T7OIILMK8H2YEh/giphy.gif",
  },
  {
    id: "wall-sit",
    name: "Wall Sit",
    category: "lower",
    type: "time",
    amount: 45,
    description: "Hold squat position against a wall",
    tips: [
      "Thighs parallel to floor",
      "Back fully against wall",
      "Breathe steadily",
    ],
    gif: "https://media.giphy.com/media/NaKGjtR1bMgVTH5Rds/giphy.gif",
  },
  {
    id: "calf-raises",
    name: "Calf Raises",
    category: "lower",
    type: "reps",
    amount: 20,
    description: "Rise onto tiptoes and lower slowly",
    tips: [
      "Rise as high as possible",
      "Lower controlled",
      "Can do on a step for more range",
    ],
    gif: "https://media.giphy.com/media/2wXXVCek2NfkneGqz9/giphy.gif",
  },
  {
    id: "glute-bridges",
    name: "Glute Bridges",
    category: "lower",
    type: "reps",
    amount: 15,
    description: "Lying on back, raise hips squeezing glutes",
    tips: [
      "Squeeze glutes at the top",
      "Hold for 2 seconds at top",
      "Don't arch lower back",
    ],
    gif: "https://media.giphy.com/media/SJWtWnRFsTiNVSECVP/giphy.gif",
  },
  {
    id: "jump-squats",
    name: "Jump Squats",
    category: "lower",
    type: "reps",
    amount: 12,
    description: "Squat followed by an explosive jump",
    tips: [
      "Land soft with knees bent",
      "Use arms for momentum",
      "Continuous fluid movement",
    ],
    gif: "https://media.giphy.com/media/WtnkfTBF2D2OsODSxf/giphy.gif",
  },

  // CARDIO
  {
    id: "jumping-jacks",
    name: "Jumping Jacks",
    category: "cardio",
    type: "time",
    amount: 45,
    description: "Jump while spreading legs and arms",
    tips: [
      "Keep a steady rhythm",
      "Land softly",
      "Arms fully extended overhead",
    ],
    gif: "https://media.giphy.com/media/RgtuKqJ8rPII4qdRjp/giphy.gif",
  },
  {
    id: "high-knees",
    name: "High Knees",
    category: "cardio",
    type: "time",
    amount: 30,
    description: "Run in place bringing knees to chest",
    tips: ["Knees to hip height", "Use your arms", "Keep core tight"],
    gif: "https://media.giphy.com/media/lboo9np8SJ58sSlGg8/giphy.gif",
  },
  {
    id: "butt-kicks",
    name: "Butt Kicks",
    category: "cardio",
    type: "time",
    amount: 30,
    description: "Run in place kicking heels to glutes",
    tips: ["Heel touches glute", "Keep torso upright", "Fast steady pace"],
    gif: "https://media.giphy.com/media/l2RnAY30gjJ6ukKJy/giphy.gif",
  },

  // FULL BODY
  {
    id: "burpees",
    name: "Burpees",
    category: "full-body",
    type: "reps",
    amount: 8,
    description: "Squat, plank, push-up, jump - the complete exercise",
    tips: [
      "Fluid movement without pauses",
      "Can skip push-up if too hard",
      "Land soft on the jump",
    ],
    gif: "https://media.giphy.com/media/KxuGSIZU1QZfRiRx4h/giphy.gif",
  },
  {
    id: "burpees-no-pushup",
    name: "Burpees (No Push-up)",
    category: "full-body",
    type: "reps",
    amount: 10,
    description: "Easier version: squat, plank, jump",
    tips: ["Great for beginners", "Keep the pace", "Jump with arms up"],
    gif: "https://media.giphy.com/media/3ohzdHUsLjzIEkK56E/giphy.gif",
  },
  {
    id: "squat-to-press",
    name: "Squat to Press",
    category: "full-body",
    type: "reps",
    amount: 15,
    description: "Squat then extend arms overhead as you rise",
    tips: [
      "Explosive movement going up",
      "Arms fully extended at top",
      "Can add weight if available",
    ],
    gif: "https://media.giphy.com/media/1jWIiKGHlkbtULERvB/giphy.gif",
  },
  {
    id: "inchworms",
    name: "Inchworm",
    category: "full-body",
    type: "reps",
    amount: 8,
    description: "From standing, walk hands out to plank and back",
    tips: [
      "Keep legs as straight as possible",
      "Add a push-up in plank for intensity",
      "Controlled movement",
    ],
    gif: "https://media.giphy.com/media/9cRdH6mSSANlnPtfYD/giphy.gif",
  },
];

export function getRandomExercise(): Exercise {
  return exercises[Math.floor(Math.random() * exercises.length)];
}

export function getExercisesByCategory(category: Category): Exercise[] {
  return exercises.filter((e) => e.category === category);
}

export function getRandomExerciseByCategory(category: Category): Exercise {
  const categoryExercises = getExercisesByCategory(category);
  return categoryExercises[
    Math.floor(Math.random() * categoryExercises.length)
  ];
}
