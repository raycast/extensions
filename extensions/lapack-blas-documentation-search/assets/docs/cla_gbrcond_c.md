```fortran
real function cla_gbrcond_c (
        character trans,
        integer n,
        integer kl,
        integer ku,
        complex, dimension( ldab, * ) ab,
        integer ldab,
        complex, dimension( ldafb, * ) afb,
        integer ldafb,
        integer, dimension( * ) ipiv,
        real, dimension( * ) c,
        logical capply,
        integer info,
        complex, dimension( * ) work,
        real, dimension( * ) rwork
)
```

CLA_GBRCOND_C Computes the infinity norm condition number of
op(A) \* inv(diag(C)) where C is a REAL vector.

## Parameters
TRANS : CHARACTER\*1 [in]
> Specifies the form of the system of equations:
> = 'N':  A \* X = B     (No transpose)
> = 'T':  A\*\*T \* X = B  (Transpose)
> = 'C':  A\*\*H \* X = B  (Conjugate Transpose = Transpose)

N : INTEGER [in]
> The number of linear equations, i.e., the order of the
> matrix A.  N >= 0.

KL : INTEGER [in]
> The number of subdiagonals within the band of A.  KL >= 0.

KU : INTEGER [in]
> The number of superdiagonals within the band of A.  KU >= 0.

AB : COMPLEX array, dimension (LDAB,N) [in]
> On entry, the matrix A in band storage, in rows 1 to KL+KU+1.
> The j-th column of A is stored in the j-th column of the
> array AB as follows:
> AB(KU+1+i-j,j) = A(i,j) for max(1,j-KU)<=i<=min(N,j+kl)

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= KL+KU+1.

AFB : COMPLEX array, dimension (LDAFB,N) [in]
> Details of the LU factorization of the band matrix A, as
> computed by CGBTRF.  U is stored as an upper triangular
> band matrix with KL+KU superdiagonals in rows 1 to KL+KU+1,
> and the multipliers used during the factorization are stored
> in rows KL+KU+2 to 2\*KL+KU+1.

LDAFB : INTEGER [in]
> The leading dimension of the array AFB.  LDAFB >= 2\*KL+KU+1.

IPIV : INTEGER array, dimension (N) [in]
> The pivot indices from the factorization A = P\*L\*U
> as computed by CGBTRF; row i of the matrix was interchanged
> with row IPIV(i).

C : REAL array, dimension (N) [in]
> The vector C in the formula op(A) \* inv(diag(C)).

CAPPLY : LOGICAL [in]
> If .TRUE. then access the vector C in the formula above.

INFO : INTEGER [out]
> = 0:  Successful exit.
> i > 0:  The ith argument is invalid.

WORK : COMPLEX array, dimension (2\*N). [out]
> Workspace.

RWORK : REAL array, dimension (N). [out]
> Workspace.
