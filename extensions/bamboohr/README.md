# BambooHR

Get employee, PTO, and team statuses from [BambooHR](https://bamboorhr.com).

## Settings

- BambooHR Subdomain - The subdomain of the URL you use to visit BambooHR, like https://{companyName}.bamboohr.com
- BambooHR API Key - This can be obtained by logging in to Bamboo HR at the subdomain as outlined above. Once there, click on your portrait in the top right, and select API keys, or visit the page directly: https://{companyName}.bamboohr.com/settings/permissions/api.php. Create a new key and give it a name. Copy it and save it in this Commands configuration.
- BambooHR Employee ID - This is needed for the PTO Calculator Command. This is your personal EmployeeID. It can be found by logging into BambooHR, selecting "My Info" from the main navigation. View your updated URL and use the *id* value as your Employee ID. For example https://{companyName}.bamboohr.com/employees/employee.php?*id=1026*.

## Looking for help?
BambooHR can have some pretty custom integrations depending on your company's setup. This extension aims to aims to reach the basic setup, but if you run into any issues, feel free to reach out:
- Author on [Raycast](https://www.raycast.com/Rob)
- Author on [Twitter](https://twitter.com/erskinerob)