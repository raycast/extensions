# Schoology Extension for Raycast

This extension will help you view your grades quickly using Raycast.
Here's an image with some example courses (I used a schoology dev account to test it which is why there are weird icons and titles):
![README Preview](README-schoology.png)
- This extension will only show a course in the `Show Grades` command if it has received at least one grade.
- As of right now, the only thing you can do is view your course's overall grades and individual assignment grades (in categories with weightage percentages). You can also see the time they were graded and any comments that may exist on them.
    - Also, the icons for each course are now your ACTUAL course's icons
    - Also, you can see assignment exceptions (excused, missing etc)
    - Feel free to reach out if you want to suggest features or even just contribute to the extension yourself!
## How to obtain Schoology Key and secret
- Head to https://[district].schoology.com/api
    - Replace [district] with your district. For example, if I were in District ABCD, then my URL would be abcd.schoology.com/api.
        - Another way to think about this is to head to the URL that you use to log in to Schoology and append `/api` at the end.
    - Next, verify that you are a human being (unless you aren't 🤖).
    - You should now have access to both your `key` and `secret`, which you can use to provide the Schoology extension with access to your grades.
        - You can do this by heading to the extension preferences `⌘ + shift + ,` and entering the credentials
- Enjoy!
## FAQ
- Why is it occasionally so slow when checking the assignments?
    - unfortunately, schoology imposes a 50 requests per 5 second limit, which means that classes with MORE than 50 assignments will likely take more than 5 seconds to fully load
    - I haven't figured out anything to fix this *yet*, but please contribute if you think you know a way to fix it
- When are what-if grades coming? Is that a planned feature?
    - Its a lot of work, but I will get to it soon. (as someone who uses this product, it does feel like something missing, and it'll definitely be a feature sometime in the near future)