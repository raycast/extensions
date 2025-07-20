# PRD: NLP Task Parser for Todoist Raycast Extension

## Objective

Add real-time natural language parsing to the existing Todoist Raycast extension's task creation form to auto-populate fields based on user input in the title field.

## Current State

- Manual form with separate fields: Title, Description, Date, Deadline, Priority, Project
- User must fill each field individually

## Target State

- User types natural language in title field: "Buy milk tomorrow p1 #Personal @urgent"
- System automatically parses and populates: Date=tomorrow, Priority=1, Project=Personal, Labels=urgent, Title="Buy milk"

## Core Parsing Patterns

| Pattern   | Syntax           | Example                          | Action                          |
| :-------- | :--------------- | :------------------------------- | :------------------------------ |
| Priority  | p1, p2, p3, p4   | "Task p1"                        | Set priority, remove from title |
| Project   | #ProjectName     | "Task #Work"                     | Set project, remove from title  |
| Labels    | @label           | "Task @urgent"                   | Add label, remove from title    |
| Dates     | Natural language | "tomorrow", "next friday at 2pm" | Set date, remove from title     |
| Deadlines | {date}           | "Task {march 30}"                | Set deadline, remove from title |
