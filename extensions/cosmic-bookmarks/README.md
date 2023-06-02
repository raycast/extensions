# Cosmic Bookmarks

Read, visit and save Bookmarks to and from Cosmic

## Getting started

In order to get started you'll need a [Cosmic account](https://app.cosmicjs.com/signup). If you already ahve one, you can create a new Bucket for your Bookmarks or modify this code locally to fetch and handle your Cosmic data to suit your needs.

## API keys

To get access to your Cosmic Bucket securely, you can provide your Bucket slug, and your read and write keys. This allows the extension to access your Bucket content and write back to it. You'll need to provie them both in order to save from your clipboard into your Bucket.
![Raycast Settings](https://media.cleanshot.cloud/media/10895/XDZcFweACbhpTHZSXDTm3HKZPqMw30Vk7mYazXPm.jpeg?Expires=1685715682&Signature=OW7A6G-HjTh7EuvYtHFqo1z3bv7xCBnU-kuzgtOCkxW48c19x-egguqMeVVDDHb13Gwfd8mwhVmg3aoVB~IyouYp~aZBq4qern9ZfmLrS7fCo8TRvzM1yNY6SmPuqG1uRqA3jjsBMHCBBK8tJ50-hX2OSJD63Ex~JzM0aban6En6vAhE-llP50zL8jhGb8E~YoO5tpaYQynL-D5XFGhKxn1Jh7a2BFAUdqwCYxjM6LksOtRmlHCgExwkVNkVFwk6jbpt-Cg77CkN7OVe3Vry-xS2rZHcjp-UiUIt0D3qEO1ExzlJTt0~ma6mteUjVuN7K1-zv7zL-ZndLZRYaaFeug__&Key-Pair-Id=K269JMAT9ZF4GZ)
![Cosmic API keys](https://media.cleanshot.cloud/media/10895/NjTiwPR4Xyvtxwv38QddUiaQa2Qswk3p7ZzB29Vj.jpeg?Expires=1685715683&Signature=Nc1i70NZUaxdgjwwtlNAr7rvxL0sp-fYY246jicol-2-UOjHasJLwnQlP6R0mU7glu-NFJ2hPgL5RGaKCEZGRBh3jNjWjM8BA~tGhbf~5fDtmMufh7~iAOYYv~hl92GMmN8TWhKzC-Rf7RtA37ofwE71wbK3qo9bJ9EDR8CcZozwWMKlIIp0m1iB6cKkZzvaXiWtfvHpRlTv3mq~Tr2f212-MVDLNLJikjEaNNn5T9Ox-N5jRZPw~7-ttkQgGbSts15plPkrLak5NdHAl47zgbor0x11iTkuAJXdAT1g~WXrqm4MaN1l7daR2BAyOuiy8nfmsD6UFnUdDI8oJxPJMA__&Key-Pair-Id=K269JMAT9ZF4GZ)

## Content model

You'll need a specific content model to use the extension as it stands. In order to get the most out of this extension, you can copy the below content model structure inside of a new Object Type. You'll need to call the Object Type 'Bookmarks' in order for the fetching to validate correctly.

**Object Type model**
![Cosmic Object Type model](https://media.cleanshot.cloud/media/10895/204ckOoNTmkRnUyu8zmFI580JpL2ICLGoMH0wxTe.jpeg?Expires=1685715684&Signature=iVuDCQdOWof3fyRn8cQQm-ErT8q1lt0HMcPlOHA6b~M1QDHchAu4kGDkVIJodqMwer9RqjWsl4yeMv9-1kg9tpdak79zyqhSeXMpbjPf30RwFI5kTFIKz0hSTll7HtfUR6C-Ae9Nukvs9UhSk-kpFEzAwnHJvcf0DTRGWjo5~lno33vbPYQXoUZYeFAW0ri3g2zHVI24K3Cal6nkPWBWMSXxYOTMUyzGjc1WMwPEHGikqCemOnIL3fU-mxB8pWnBW9YuSuJifgrHB~eH9D9Z5PWG69jzYqo9PR4zxJpV1q5CQCTTHCqxvCgQJ-X1f8UujXFAcIGfnxf1whNKDrKrzA__&Key-Pair-Id=K269JMAT9ZF4GZ)

```json
{
  "object_types": [
    {
      "title": "Bookmarks",
      "slug": "bookmarks",
      "singular": "Bookmark",
      "metafields": [
        {
          "children": null,
          "type": "text",
          "title": "snippet",
          "key": "snippet",
          "id": "snippet-metafield-id",
          "value": ""
        },
        {
          "children": null,
          "type": "text",
          "title": "url",
          "key": "url",
          "id": "url-metafield-id",
          "value": ""
        },
        {
          "children": null,
          "type": "switch",
          "title": "read",
          "key": "read",
          "id": "read-metafield-id",
          "value": false,
          "options": "true,false"
        }
      ],
      "options": {
        "slug_field": 1,
        "content_editor": 0
      }
    }
  ]
}
```
