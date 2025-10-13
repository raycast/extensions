```fortran
subroutine zlaic1 (
        integer job,
        integer j,
        complex*16, dimension( j ) x,
        double precision sest,
        complex*16, dimension( j ) w,
        complex*16 gamma,
        double precision sestpr,
        complex*16 s,
        complex*16 c
)
```

ZLAIC1 applies one step of incremental condition estimation in
its simplest version:

Let x, twonorm(x) = 1, be an approximate singular vector of an j-by-j
lower triangular matrix L, such that
twonorm(L\*x) = sest
Then ZLAIC1 computes sestpr, s, c such that
the vector
[ s\*x ]
xhat = [  c  ]
is an approximate singular vector of
[ L       0  ]
Lhat = [ w\*\*H gamma ]
in the sense that
twonorm(Lhat\*xhat) = sestpr.

Depending on JOB, an estimate for the largest or smallest singular
value is computed.

Note that [s c]\*\*H and sestpr\*\*2 is an eigenpair of the system

diag(sest\*sest, 0) + [alpha  gamma] \* [ conjg(alpha) ]
[ conjg(gamma) ]

where  alpha =  x\*\*H \* w.

## Parameters
JOB : INTEGER [in]
> = 1: an estimate for the largest singular value is computed.
> = 2: an estimate for the smallest singular value is computed.

J : INTEGER [in]
> Length of X and W

X : COMPLEX\*16 array, dimension (J) [in]
> The j-vector x.

SEST : DOUBLE PRECISION [in]
> Estimated singular value of j by j matrix L

W : COMPLEX\*16 array, dimension (J) [in]
> The j-vector w.

GAMMA : COMPLEX\*16 [in]
> The diagonal element gamma.

SESTPR : DOUBLE PRECISION [out]
> Estimated singular value of (j+1) by (j+1) matrix Lhat.

S : COMPLEX\*16 [out]
> Sine needed in forming xhat.

C : COMPLEX\*16 [out]
> Cosine needed in forming xhat.
