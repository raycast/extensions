
## RayCaset Plugin Requirements

- [x] Add a panel for the LOKI query generator
- [x] Add a text field for input the Service Name -> Corresponding to the namespace in the query
- [x] Add a Form.Checkbox to ignore capital letters in the query "(?i)"
- [x] Add a Form.TagPicker to choose INFO / ERROR / WARN or any combination to support multiple levels
- [x] Add a Form.Dropdown to choose from Staging or Production
- [x] Add a Form.Button to generate the query and open the dashboard in browser
- [x] Add a Text field to enter the search words
- [x] Design it with modern look with proper colors and spacing and alignment

## Reference data

- Query detail

{cluster=~".*", namespace="self-service", container="service"} |~ "\\[NameMismatchFormGeneratorV3\\]\\[1458023763\\]" | json | level=~`INFO|ERROR` | line_format "{{._timestamp}} {{.stack_trace}} -- {{ default __line__ .message }}"

- Website ( the url encoded version of the query and full link to the dashboard)

<https://dashboards.tw.ee/explore?schemaVersion=1&panes=%7B%22d9s%22:%7B%22datasource%22:%22P8AB12B8B65EF59AE%22,%22queries%22:%5B%7B%22refId%22:%22A%22,%22expr%22:%22%7Bcluster%3D~%5C%22.%2A%5C%22,%20namespace%3D%5C%22self-service%5C%22,%20container%3D%5C%22service%5C%22%7D%20%7C~%20%5C%22%5C%5C%5C%5C%5BNameMismatchFormGeneratorV3%5C%5C%5C%5C%5D%5C%5C%5C%5C%5B1458023763%5C%5C%5C%5C%5D%5C%22%20%7C%20json%20%7C%20level%3D~%60INFO%7CERROR%60%20%7C%20line_format%20%5C%22%7B%7B._timestamp%7D%7D%20%7B%7B.stack_trace%7D%7D%20--%20%7B%7B%20default%20__line__%20.message%20%7D%7D%5C%22%22,%22queryType%22:%22range%22,%22datasource%22:%7B%22type%22:%22loki%22,%22uid%22:%22P8AB12B8B65EF59AE%22%7D,%22editorMode%22:%22code%22%7D%5D,%22range%22:%7B%22from%22:%22now-3h%22,%22to%22:%22now%22%7D,%22panelsState%22:%7B%22logs%22:%7B%22visualisationType%22:%22logs%22%7D%7D%7D%7D&orgId=1>

- Staging dashboard

<https://test-dashboards.tw.ee/> + the rest of the query
