# Rails Routes for Raycast

A Raycast extension that allows you to browse and search through your Rails application routes directly from Raycast while you're developing your Rails application locally.

[Docs about Inspect Rails Routes](https://guides.rubyonrails.org/routing.html#listing-existing-routes)

## Features

- 🔍 List all routes in your local Rails application
- 🎯 Search routes by path, controller, or action
- 🎨 Color-coded HTTP methods for better visualization
- 📱 Group routes by controllers for better organization
- 🚀 Quick access to route details

## Important Note ⚠️

This extension is designed to work with Rails applications running in **development mode** on **localhost**. It's a development tool to help you navigate your routes while coding.

## Prerequisites

- A Rails application running locally in development mode
- Raycast installed on your machine
- Access to `localhost:[port]` where your Rails server is running

## Installation

1. Open Raycast
2. Search for "Rails Routes" in the Raycast Store
3. Click Install

## Configuration

Before using the extension, you need to configure:

- **Rails Server Port**: The port number where your local Rails server is running (default: 3000)

You can configure this in the extension preferences in Raycast.

## Usage

1. Make sure your Rails server is running locally (`rails server`)
2. Open Raycast
3. Type "Rails Routes" or "List routes"
4. Press Enter to see all routes
5. Use the search bar to filter routes by path, controller, or action

## HTTP Methods Color Coding

The extension uses different colors to distinguish between HTTP methods:

- GET - Blue 🔵
- POST - Green 🟢
- PUT - Orange 🟠
- PATCH - Yellow 🟡
- DELETE - Red 🔴

## License

MIT License - feel free to use and modify as you wish.

## Author

Created by [Renzo](https://github.com/renzo4web)
