#!/usr/bin/env python3

import httpx

# The default headers for all HTTP requests
DEFAULT_HEADERS = {
    'user-agent': 'YouVersion Suggest'
}


# A wrapper around the httpx.get() function that injects a user-agent into
# every request (this helps bypass CloudFlare's bot protection)
def get(url):
    return httpx.get(url, headers=DEFAULT_HEADERS)
