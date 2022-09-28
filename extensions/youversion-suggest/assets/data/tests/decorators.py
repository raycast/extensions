#!/usr/bin/env python3
# coding=utf-8

import sys
from functools import wraps
from io import StringIO


def redirect_stdout(func):
    """temporarily redirect stdout to new Unicode output stream"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        original_stdout = sys.stdout
        out = StringIO()
        try:
            sys.stdout = out
            return func(out, *args, **kwargs)
        finally:
            sys.stdout = original_stdout
    return wrapper
