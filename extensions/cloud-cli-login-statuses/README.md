# Cloud CLI Login Statuses

A Raycast extension to check if you are logged in to AWS, Google Cloud, and Azure CLIs.

## Description

This extension provides a quick overview of your login status across multiple cloud providers directly from Raycast. It's particularly useful when working on cloud-agnostic projects or managing multi-cloud infrastructure.

## Features

- Displays login status for AWS, Google Cloud, and Azure CLIs
- Shows your account information when logged in
- Provides a refresh action to update statuses
- Allows copying status information to clipboard

## Requirements

- [Raycast](https://raycast.com/)
- AWS CLI (`aws`) - For AWS status check
- Google Cloud CLI (`gcloud`) - For Google Cloud status check
- Azure CLI (`az`) - For Azure status check

Make sure these CLIs are installed and properly configured on your system. The extension will automatically detect them in standard installation paths.

## Use Case

When working on cloud-agnostic projects, especially with tools like Terraform for infrastructure deployment, this extension helps you avoid failed builds due to authentication issues. Instead of discovering halfway through a deployment that you're not logged in to a particular cloud provider, you can:

1. Check your login status across all cloud CLIs before starting
2. Log in to any providers where authentication is missing or expired
3. Proceed confidently with your deployment

This simple pre-check saves time and frustration, particularly when switching between different cloud environments or when credentials have time-based expirations.

## How It Works

The extension checks your cloud CLI login status by running the following commands:

- AWS: `aws sts get-caller-identity`
- Google Cloud: `gcloud auth list --filter=status:ACTIVE --format=value(account)`
- Azure: `az account show`

Results are displayed in a simple list interface that updates in real-time.