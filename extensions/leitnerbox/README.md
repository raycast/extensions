# LeitnerBox

Yay! This is my first extension in raycast.
This simple extension use the concept of a learning process called leitner box


## How to use it
---

your goal is to create questions and an answer based on the topic you want to learn.

you have 6 boxes each box correspond of a number of days before the program will push the question in youre daily question

`js
    {
        0: 1, // 1 day
        1: 2, // 2 days
        2: 4,  // 4 days
        3: 8,  // 8 days
        4: 10, // 10 days
        5: -1, // correspond to learned category
    }
`

### when you do youre daily question

you have to answer out loud in your own words.
and judge for yourself if you were right

if youre response is true the question will go to the next box
if its false it will go to the previous box

when it reached the last box you should have learned the youre topic

---

Ps: Feel free to contact me if you have a question or an idea to improve my concept
