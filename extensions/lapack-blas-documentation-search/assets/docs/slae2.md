```fortran
subroutine slae2 (
        real a,
        real b,
        real c,
        real rt1,
        real rt2
)
```

SLAE2  computes the eigenvalues of a 2-by-2 symmetric matrix
[  A   B  ]
[  B   C  ].
On return, RT1 is the eigenvalue of larger absolute value, and RT2
is the eigenvalue of smaller absolute value.

## Parameters
A : REAL [in]
> The (1,1) element of the 2-by-2 matrix.

B : REAL [in]
> The (1,2) and (2,1) elements of the 2-by-2 matrix.

C : REAL [in]
> The (2,2) element of the 2-by-2 matrix.

RT1 : REAL [out]
> The eigenvalue of larger absolute value.

RT2 : REAL [out]
> The eigenvalue of smaller absolute value.
