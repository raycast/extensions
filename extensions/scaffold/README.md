# Scaffold

Scaffold is a brand new extension that allows you to create templates of your projects and create new projects from templates.

There are currently two ways of creating a new template, either by **folder** or **command** I'll explain more below:

## Creating a template

You can use the **Create template** command in Raycast to create a new template, you'll see there's a few options available:

 - **Name**
This is the name you want to call your new template

 - **Create from**
You can choose whether you'd like to clone an entire folder or use a CLI command like **__npx create-nuxt-app__** to generate the files and folders

 - **Folder**
If you selected to create from a folder then you can select the folder you want to clone here

 - **Command**
If you selected to create from a command then you can enter in the command you want to use to generate the files and folders

 - **Output folder**
This is the default directory that's used to organise all the projects created using this specific template, for example if you create a "React JS" template then it might be good to create a folder called "React JS" to store all these project folders, by default it's set to your home directory

Once you've created your template it'll automatically copy the folder to this extension's support directory to keep it safe and it'll then open up this codebase in VSCode

## Managing your templates

You can use the **Manage templates** command in Raycast to manage all your existing templates, you can either open the codebase, edit the template configuration or delete the template.

## New project

You can use the **New project** command in Raycast to create a new project from your newly created template.