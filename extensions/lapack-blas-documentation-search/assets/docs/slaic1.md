```fortran
subroutine slaic1 (
        integer job,
        integer j,
        real, dimension( j ) x,
        real sest,
        real, dimension( j ) w,
        real gamma,
        real sestpr,
        real s,
        real c
)
```

SLAIC1 applies one step of incremental condition estimation in
its simplest version:

Let x, twonorm(x) = 1, be an approximate singular vector of an j-by-j
lower triangular matrix L, such that
twonorm(L\*x) = sest
Then SLAIC1 computes sestpr, s, c such that
the vector
[ s\*x ]
xhat = [  c  ]
is an approximate singular vector of
[ L      0  ]
Lhat = [ w\*\*T gamma ]
in the sense that
twonorm(Lhat\*xhat) = sestpr.

Depending on JOB, an estimate for the largest or smallest singular
value is computed.

Note that [s c]\*\*T and sestpr\*\*2 is an eigenpair of the system

diag(sest\*sest, 0) + [alpha  gamma] \* [ alpha ]
[ gamma ]

where  alpha =  x\*\*T\*w.

## Parameters
JOB : INTEGER [in]
> = 1: an estimate for the largest singular value is computed.
> = 2: an estimate for the smallest singular value is computed.

J : INTEGER [in]
> Length of X and W

X : REAL array, dimension (J) [in]
> The j-vector x.

SEST : REAL [in]
> Estimated singular value of j by j matrix L

W : REAL array, dimension (J) [in]
> The j-vector w.

GAMMA : REAL [in]
> The diagonal element gamma.

SESTPR : REAL [out]
> Estimated singular value of (j+1) by (j+1) matrix Lhat.

S : REAL [out]
> Sine needed in forming xhat.

C : REAL [out]
> Cosine needed in forming xhat.
