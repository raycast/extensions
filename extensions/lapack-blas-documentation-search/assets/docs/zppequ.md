```fortran
subroutine zppequ (
        character uplo,
        integer n,
        complex*16, dimension( * ) ap,
        double precision, dimension( * ) s,
        double precision scond,
        double precision amax,
        integer info
)
```

ZPPEQU computes row and column scalings intended to equilibrate a
Hermitian positive definite matrix A in packed storage and reduce
its condition number (with respect to the two-norm).  S contains the
scale factors, S(i)=1/sqrt(A(i,i)), chosen so that the scaled matrix
B with elements B(i,j)=S(i)\*A(i,j)\*S(j) has ones on the diagonal.
This choice of S puts the condition number of B within a factor N of
the smallest possible condition number over all possible diagonal
scalings.

## Parameters
UPLO : CHARACTER\*1 [in]
> = 'U':  Upper triangle of A is stored;
> = 'L':  Lower triangle of A is stored.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.

AP : COMPLEX\*16 array, dimension (N\*(N+1)/2) [in]
> The upper or lower triangle of the Hermitian matrix A, packed
> columnwise in a linear array.  The j-th column of A is stored
> in the array AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2n-j)/2) = A(i,j) for j<=i<=n.

S : DOUBLE PRECISION array, dimension (N) [out]
> If INFO = 0, S contains the scale factors for A.

SCOND : DOUBLE PRECISION [out]
> If INFO = 0, S contains the ratio of the smallest S(i) to
> the largest S(i).  If SCOND >= 0.1 and AMAX is neither too
> large nor too small, it is not worth scaling by S.

AMAX : DOUBLE PRECISION [out]
> Absolute value of largest matrix element.  If AMAX is very
> close to overflow or very close to underflow, the matrix
> should be scaled.

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = i, the i-th diagonal element is nonpositive.
