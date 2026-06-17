export const markdownTemplates = {
  quiz: `
# 🍩 {question}
##

-------------

>  1️⃣ {option1}

-------------

>  2️⃣ {option2}

-------------

>  3️⃣ {option3}

-------------
`,

  loading: `Topic: **{topic}**

Your new snack is loading ...`,

  answer: `
# 🍩 {question}
##

{resultMessage}
##

{answer}
`,

  statistics: `
# 📊 Your Snack Statistics 

## Overall Performance
- **Correct Answers**: {correctAnswers}
- **Total Answers**: {totalAnswers}
- **Accuracy**: {accuracy}%

## Learning Progress
- **Days Played**: {daysPlayed}
- **Total Snacks**: {totalSnacks}
##

The more you snack, the smarter you'll get. 🍫🧠
`,

  error: `
# Sorry, we're out of snacks right now. 💔

Please try again later.`,
};
