```fortran
subroutine slabad (
        real small,
        real large
)
```

SLABAD is a no-op and kept for compatibility reasons. It used
to correct the overflow/underflow behavior of machines that
are not IEEE-754 compliant.

## Parameters
SMALL : REAL [in,out]
> On entry, the underflow threshold as computed by SLAMCH.
> On exit, the unchanged value SMALL.

LARGE : REAL [in,out]
> On entry, the overflow threshold as computed by SLAMCH.
> On exit, the unchanged value LARGE.
