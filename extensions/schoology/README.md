# Schoology Extension for Raycast

![README Preview](RaycastSchoology.png)
- This extension will only show a course in the `Show Grades` command if it has received at least one grade.
- You can view all the graded assignments, including their titles, descriptions, attatchments, comments and grades
- You also have FREE local notifications available. The extension checks every 20 minutes for a grade update and decides whether to send a notification or not based on whether a new assignment has been graded
    - You can manually check by activating the `Check for Grade Updates` command
    - You can disable the background refresh in settings, and this stops all notifications from showing up (unless you manually activate the command)
## How to obtain Schoology Key and secret
- Head to https://[district].schoology.com/api
    - Replace [district] with your district. For example, if I were in District ABCD, then my URL would be abcd.schoology.com/api.
        - Another way to think about this is to head to the URL that you use to log in to Schoology and append `/api` at the end.
    - Next, verify that you are a human being (unless you are a 🤖).
    - You should now have access to both your `key` and `secret`, which you can use to provide the Schoology extension with access to your grades.
        - You can do this by heading to the extension preferences `⌘ + shift + ,` and entering the credentials
- Enjoy!
## How to use
- When you open the command `Show Grades`, you are immediately presented with the courses you have a grade in
    - See how long ago your grade has been updated
    - See the letter grade, followed by the percentage
        - I'm not using the custom grade scales that teachers present. Just the default. The reason is because I want to lower the requests I have to make to make this extension faster. Feel free to PR if you have ideas!
- Click enter on the course to go further and view graded assignments
    - See the overall grade as a list item at the top
        - Click `return` to open the graph (which you can also open in browser to view the points more closely)
    - Below are each of the categories (with their weightage information in the section's title) with their assignments
        - for each assignment, you can see when it was graded, the score, and the letter grade
        - you can also view (and copy) the comment the teacher left on your assignment
        - grade exceptions (missing, excused etc) are also indicated in your gradebook
    - hit enter to go *even further* to see the assignment details
        - see the title, description, grade information, due date + graded date, and attachments for the selected assignment. even open it in the browser!

Enjoy seeing your grades at the press of a hotkey (mine is `hyper + S`) and enjoy a keyboard first way of viewing your grades.

## FAQ
- Why is it occasionally so slow when checking the assignments?
    - unfortunately, schoology imposes a 50 requests per 5 second limit, which means that classes with MORE than 50 assignments will likely take more than 5 seconds to fully load
    - I haven't figured out anything to fix this *yet*, but please contribute if you think you know a way to fix it
- When are what-if grades coming? Is that a planned feature?
    - Its a lot of work, but I will get to it soon. (as someone who uses this product, it does feel like something missing, and it'll definitely be a feature sometime in the near future)