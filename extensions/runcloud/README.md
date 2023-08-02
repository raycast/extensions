# Runcloud

Browse Runcloud Servers and Webapps

This extension allows you to interact with [Runcloud](https://runcloud.io/) and easily search and browse your servers
and webapps.

The default webapp search in Runclouds interface has always been highly buggy, and only allows you to type very slowly
without making any typos as the typeahead search experiences a tremendous amount of lag. This extension bypasses that by
caching your webapp list locally, allowing for instant searches.

## Configring Extension

Log into your Runcloud account and navigate to your [API Key Settings Page](https://manage.runcloud.io/settings/apikey)
to acquire the API Key and API Secret.

## Commands

### Search Runcloud Servers

Lists and searches through your Runcloud server list by name using the Runcloud API. It loops throug every page and
joins them together into one list. Runclouds API has no `per_page` option so this makes 1 query per page.

### Search Runcloud Webapps

Lists and searches through your Runcloud webapp list by name. The Runcloud API only allows listing your webapps
per server page and does not currently have a way to query for all of your webapps regardless of server. This command
makes one API call per server in your account and joins all of the webapps together into one list.

### Rebuild Webapps Cache

Run in the background every 15 minutes to refresh your list of webapps. This is due to the fact that to compile a
list of webapps we must query the Runcloud API once per server, per page of webapps, at 15 per page.
