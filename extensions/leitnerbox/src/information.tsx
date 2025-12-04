import { Detail } from "@raycast/api";
export default function Information() {
  return (
    <Detail
      markdown={` # What is the leitner system

The **Leitner system** is a widely used method of efficiently using  **flashcards** that was proposed by the German science journalist [Sebastian Leitner](https://en.wikipedia.org/wiki/Sebastian_Leitner "Sebastian Leitner") in 1972. 
It is a simple implementation of the principle of **spaced repetition**, where cards are reviewed at increasing intervals to integrate it into long-term memory.

![how brain retain information](../assets/MemoryGraph.png)


## How to use it.
First of all you have to create some questions and answers about a subject you would like to learn.
 with the command **Create A Question**.

Once you create one or multiple questions it will be in a **Box**.

There are 5 boxes of cards called "Box 1", "Box 2", "Box 3", "Box 4", "Box 5". The cards in Box 1 are the ones that the learner often makes mistakes with, and Box 5 contains the cards that they know very well. They might choose to study the **Box 1** cards **once a day**,  **Box 2** every **2 days**, **Box 3** cards every **4 days**, **Box 4** cards every **8 days**, and **Box 5** cards every **10 days** . If they look at a card in **Box 1** and get the correct answer, they **"promote" it to Box 2** . A correct answer with a card in **Box 2 "promotes" that card to Box 3** until it is learned. If they make a mistake with a card in a Box, it gets "demoted" to the box before it .  A bad answer in the **Box 3** will result of a "**demoted" in the Box2**, which forces the learner to study that card more often.

![leitner system ](../assets/boxUseCase.png)

#### summary of the number of days before you can answer the questions.
- Box1: 1 day
- Box 2: 2 days
- Box 3: 4 days
- Box 4: 8 days
- Box 5: 10 days

### How to answer a question .
  
The goal when answering a question. Is to do it in your **own words** as if you were **explaining it to another person**. Even if it differs from the original answer.

**You are your own judge**  it's up to you to see if your answer is close enough to the answer you wrote. Because **there is no better judge than yourself**.

If you judge that you have answered incorrectly, the **goal** is to return to this part of your **course or subject** that you are **learning** and reread the part corresponding to the question to improve the **chance of retention in long-term memory.**
`}
    />
  );
}
