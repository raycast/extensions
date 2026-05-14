```fortran
subroutine spoequ (
        integer n,
        real, dimension( lda, * ) a,
        integer lda,
        real, dimension( * ) s,
        real scond,
        real amax,
        integer info
)
```

SPOEQU computes row and column scalings intended to equilibrate a
symmetric positive definite matrix A and reduce its condition number
(with respect to the two-norm).  S contains the scale factors,
S(i) = 1/sqrt(A(i,i)), chosen so that the scaled matrix B with
elements B(i,j) = S(i)\*A(i,j)\*S(j) has ones on the diagonal.  This
choice of S puts the condition number of B within a factor N of the
smallest possible condition number over all possible diagonal
scalings.

## Parameters
N : INTEGER [in]
> The order of the matrix A.  N >= 0.

A : REAL array, dimension (LDA,N) [in]
> The N-by-N symmetric positive definite matrix whose scaling
> factors are to be computed.  Only the diagonal elements of A
> are referenced.

LDA : INTEGER [in]
> The leading dimension of the array A.  LDA >= max(1,N).

S : REAL array, dimension (N) [out]
> If INFO = 0, S contains the scale factors for A.

SCOND : REAL [out]
> If INFO = 0, S contains the ratio of the smallest S(i) to
> the largest S(i).  If SCOND >= 0.1 and AMAX is neither too
> large nor too small, it is not worth scaling by S.

AMAX : REAL [out]
> Absolute value of largest matrix element.  If AMAX is very
> close to overflow or very close to underflow, the matrix
> should be scaled.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, the i-th diagonal element is nonpositive.
