---
title: Ansible roles
category: Ansible
tech: ansible-roles
status: active
lastReviewed: '2025-09-05'
---

### Structure

    roles/
      common/
        tasks/
        handlers/
        files/              # 'copy' will refer to this
        templates/          # 'template' will refer to this
        meta/               # Role dependencies here
        vars/
        defaults/
          main.yml

### References

 * http://www.ansibleworks.com/docs/playbooks_roles.html
