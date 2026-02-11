```fortran
subroutine sladiv (
        real a,
        real b,
        real c,
        real d,
        real p,
        real q
)
```

SLADIV performs complex division in  real arithmetic

a + i\*b
p + i\*q = ---------
c + i\*d

The algorithm is due to Michael Baudin and Robert L. Smith
and can be found in the paper

## Parameters
A : REAL [in]

B : REAL [in]

C : REAL [in]

D : REAL [in]
> The scalars a, b, c, and d in the above expression.

P : REAL [out]

Q : REAL [out]
> The scalars p and q in the above expression.
