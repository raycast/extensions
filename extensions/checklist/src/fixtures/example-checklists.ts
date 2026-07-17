import type { Checklist } from "../types";
import { nanoid } from "nanoid";

const exampleChecklists: Checklist[] = [
  {
    id: nanoid(),
    title: "Review Pull Requests",
    tasks: [
      {
        name: "Tests are passing",
        isCompleted: false,
      },
      {
        name: "Comparison with original requirement",
        isCompleted: false,
      },
      {
        name: "Code review",
        isCompleted: false,
      },
      {
        name: "Merge & release",
        isCompleted: false,
      },
    ],
    isStarted: true,
    progress: 0,
  },
  {
    id: nanoid(),
    title: "Publish Raycast Extension",
    tasks: [
      {
        name: "Check metadata and configuration",
        isCompleted: false,
      },
      {
        name: "Extensions and commands naming",
        isCompleted: false,
      },
      {
        name: "Create an extension icon",
        isCompleted: false,
      },
      {
        name: "Write a README",
        isCompleted: false,
      },
      {
        name: "Choose a category",
        isCompleted: false,
      },
      {
        name: "Take screenshots",
        isCompleted: false,
      },
    ],
    isStarted: false,
    progress: 0,
  },
  {
    id: nanoid(),
    title: "Update Raycast Extension",
    tasks: [
      {
        name: "Make NPM RUN BUILD work",
        isCompleted: false,
      },
      {
        name: "Update README",
        isCompleted: false,
      },
      {
        name: "Update screenshots",
        isCompleted: false,
      },
      {
        name: "Update changelog",
        isCompleted: false,
      },
    ],
    isStarted: false,
    progress: 0,
  },
];

export default exampleChecklists;
