```fortran
real function sroundup_lwork (
        integer lwork
)
```

SROUNDUP_LWORK deals with a subtle bug with returning LWORK as a Float.
This routine guarantees it is rounded up instead of down by
multiplying LWORK by 1+eps when it is necessary, where eps is the relative machine precision.
E.g.,

float( 16777217            ) == 16777216
float( 16777217 ) \* (1.+eps) == 16777218

\return SROUNDUP_LWORK
\verbatim
SROUNDUP_LWORK >= LWORK.
SROUNDUP_LWORK is guaranteed to have zero decimal part.
