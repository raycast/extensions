# Raynab

![Cover](./media/raynab-cover.jpg)

## Overview

[You Need A Budget](https://www.youneedabudget.com/), or simply YNAB, is a budgeting app popular for its focus on budget managing tenant called [_The Four Rules_](https://www.youneedabudget.com/the-four-rules/).

Raynab is an extension which allows YNAB users to manage one or multiple budgets directly from within Raycast. The aim is to reduce friction and allow you to stay on top of your budget at any point in time.

## Getting Started

You will need a YNAB account to use this extension. If you don’t you can [start a new trial](https://www.youneedabudget.com/).

### Credentials

Raynab is powered by the [YNAB API](https://api.youneedabudget.com/). In order for the extension to work, it needs to have access to your account via your Personal Access Token. Here are the steps necessary to obtain them:

1. [Sign in to the YNAB web app](https://api.youneedabudget.com/) and get to the "**Account Settings**"
2. Locate and navigate to the “**Developer Settings**” page
3. Click on the “New Token” section button under the “**Personal Access Tokens**” section
4. Enter your password and click “**Generate**” to get an access token
5. Open a Raynab command
6. Follow the instructions and paste your Access Token in the `token` field.

<!-- Insert image here -->

### Budget Selection

<!-- Insert image here -->

Given that YNAB can be used to handle multiple budgets, in order to properly use the extension across its 5 commands, you must select the budget you would like to have access to.

The `Select Active Budget` command lists all your budgets. The currently selected one will display a checkmark on its right. To change it simply press `Enter` and the selection will be saved locally. Once that's done, you're set 🎉

You can change the active budget at any time using the command. For most people with only one budget, that won’t be necessary after the first time.

## Commands

### List Transactions

This command will list your transactions for up to a year. It is the heart of Raynab as this will probably the place where you will spend most of your time understanding your inflows and outflows.

#### _Transaction Item_

Each transaction is presented from left to right:

- A chevron, pointing up for inflows and down for outflows
- The name of the payee
- The amount of the transaction (either positive or negative)
- How long ago it occurred

#### _Actions_

- Inspect Transaction

  - Show Transaction (`↵`): Give a detailed view of the transaction
    - Amount
    - Payee
    - Date
    - Category
  - Edit Transaction (`⌘` + `↵`): Edit any of the provided transaction information
    - Date
    - Amount
    - Payee Name
    - Memo
    - Flag
  - Open in YNAB (`⌘` + `O`): Open the current budget in the YNAB Web App

    YNAB doesn’t have a specific view of the transaction, this will simply direct you to the transaction view for the associated account.

  - Toggle Flags (`⌥` + `F`): Show or hide flags for all transactions

    Flags are hidden by default as they are optional for users of YNAB

- Modify List View

  > Actions in this list are behind submenus. Each action will show a checkmark icon when selected. Click on the same action to deselect it.

  - Set Grouping (`⌘` + `G`): Group transactions in sections by a given criterion
    - Category: The category of the transaction
    - Payee: The counterpart name
    - Account: The account of the transaction
  - Set Sorting (`⌘` + `S`): Sort the transactions
    - Amount ascending
    - Amount descending
    - Date ascending
    - Date descending — This is the default. Will return to this state if nothing is selected.
  - Set Timeline (`⌘` + `T`): Allow to change the time period of the listed transactions

    - Last day
    - Last week
    - Last month
    - Last quarter
    - Last year

      > This action has a particular behaviour if you have noticed. If you try to select a period in which a transaction hasn’t occurred, it will automatically select the closest period at which there is at least one transaction.
      > For example, if the last transaction occurred 2 days ago and you try to select `Last Day`, it will fall back to the last week's timeline.
      > When opening the Command for the first time, we make this check for you.

  - Set Filter (`⌘` + `F`): Filter the transactions by inflow or outflow

    - Inflow: Positive transactions are shown
    - Outflow: Negative transactions are shown

      > This action is superseded by the advanced search feature, more on that below, but I’ve decided to keep it.

#### _Advanced Search_

My personal favourite feature about the extension. Advanced Search makes use of modifiers to filter the transactions list to match the query. It is mainly inspired by Slack and Google search features.

Here are the available modifiers:

- `account` Only show results for the given account name. Spaces within account names can be replaced with a hyphen (`-`).
- `type` Can either be “inflow" or "outflow”. This is similar to the Filter submenu mentioned above.
- `category` Only show results for the matched category name

Let’s say you would like to search for a transaction at your favourite restaurant, Taco Bell (I won’t judge).

- Typing `Taco Bell` will show you all the results for a payee matching that query.
- Typing `Taco Bell account:chase-checking` will show all the transactions for "Taco Bell" in your "Chase Checking" account.
- Typing `Taco Bell account:chase-checking category:vacation` will show all the transactions for “Taco Bell" in your “Chase Checking" account that were registered under "Vacation”.

As you can see, you can combine modifiers with your query, but what if you wanted to show all of a payee’s transactions which did not occur in a particular account.

Negative modifiers are the same as normal modifiers, but instead they will _exclude_ all transactions which match their input.

- Typing `Taco Bell account:chase-checking -category:groceries` will show Taco Bell transactions but not those you have filed as "Groceries” by "mistake”.

> You don't need to enter a payee name before using modifiers. For example `type:inflow` will show _all_ transactions with non-negative amounts.

**Note:** **The payee name must happen before any modifiers otherwise they will be ignored. Typing `account:chase-checking Taco Bell`** **will show all transactions in your Chase Checking account.**

### Create Transaction

File a new transaction into your budget by entering its related information.

The following fields are required:

- Date
- Amount (Must be a non-zero floating point number)
- Payee Name
- Category

### List Accounts

Display a list of all accounts associated with the selected budget.

#### _Account Item_

Each account is presented from left to right:

- A green icon when the account is considered “On Budget”, red otherwise
- The name of the account
- A link icon denoting the status of “[Direct Import Linking](https://docs.youneedabudget.com/article/172-link-account)” for that account:
  - Grey: The account isn’t linked
  - Green: The direct import is functioning
  - Red: There is an error with the direct import

#### _Actions_

- Create New Transaction (`↵`): Create a new transaction on the selected account
  - Amount
  - Payee
  - Date
  - Category
- Open in YNAB (`⌘` + `O`): Open the current account in the YNAB web app

  YNAB doesn’t have a specific view of the transaction, this will simply direct you to your budget. In the future, we will change the redirect to lead to your account.

### View Active Budget

Gives access to the current monthly budget information by listing its different categories along with their balance and state.

#### _Category Item_

Categories are grouped in their original category group. Each category is presented from left to right:

- The category name
- The remaining balance to date

#### _Actions_

- Inspect Budget

  - Show Category (`↵`): Give a detailed view of the category
    - Goal (if there’s one)
    - Budgeted
    - Activity this month
  - Show Monthly Budget (`⌘` + `↵`): Show additional information about the monthly budget
    - Budgeted
    - Activity this month
    - Age of Money
    - To Be Budgeted
    - Income
  - Open in YNAB (`⌘` + `O`): Open the current budget in the YNAB Web App

  - Toggle Progress (`⌘` + `P`): Show or hide progress bar for category goals

    Categories with no goals or associated progress will show as `N/A`

- Modify List View
  - Edit Category (`⌘` + `E`): Edit any of the provided transaction information
    - Budgeted Amount (This is a restriction of the current YNAB API)
  - Create New Transaction (`⌥` + `C` ): Create a new transaction in the selected category
    - Category: The category of the transaction
    - Payee: The counterpart name
    - Account: The account of the transaction

## Author

Charles De Mount is a design and coding enthusiast currently supporting customers at [Vercel](https://vercel.com/).
Send pets pics or angry messages on Twitter: [@nogocharli](https://twitter.com/nogocharli)

Special thanks to the Raycast team for the fantastic API!
