```fortran
double precision function dla_gbrcond (
        character trans,
        integer n,
        integer kl,
        integer ku,
        double precision, dimension( ldab, * ) ab,
        integer ldab,
        double precision, dimension( ldafb, * ) afb,
        integer ldafb,
        integer, dimension( * ) ipiv,
        integer cmode,
        double precision, dimension( * ) c,
        integer info,
        double precision, dimension( * ) work,
        integer, dimension( * ) iwork
)
```

DLA_GBRCOND Estimates the Skeel condition number of  op(A) \* op2(C)
where op2 is determined by CMODE as follows
CMODE =  1    op2(C) = C
CMODE =  0    op2(C) = I
CMODE = -1    op2(C) = inv(C)
The Skeel condition number  cond(A) = norminf( |inv(A)||A| )
is computed by computing scaling factors R such that
diag(R)\*A\*op2(C) is row equilibrated and computing the standard
infinity-norm condition number.

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

AB : DOUBLE PRECISION array, dimension (LDAB,N) [in]
> On entry, the matrix A in band storage, in rows 1 to KL+KU+1.
> The j-th column of A is stored in the j-th column of the
> array AB as follows:
> AB(KU+1+i-j,j) = A(i,j) for max(1,j-KU)<=i<=min(N,j+kl)

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= KL+KU+1.

AFB : DOUBLE PRECISION array, dimension (LDAFB,N) [in]
> Details of the LU factorization of the band matrix A, as
> computed by DGBTRF.  U is stored as an upper triangular
> band matrix with KL+KU superdiagonals in rows 1 to KL+KU+1,
> and the multipliers used during the factorization are stored
> in rows KL+KU+2 to 2\*KL+KU+1.

LDAFB : INTEGER [in]
> The leading dimension of the array AFB.  LDAFB >= 2\*KL+KU+1.

IPIV : INTEGER array, dimension (N) [in]
> The pivot indices from the factorization A = P\*L\*U
> as computed by DGBTRF; row i of the matrix was interchanged
> with row IPIV(i).

CMODE : INTEGER [in]
> Determines op2(C) in the formula op(A) \* op2(C) as follows:
> CMODE =  1    op2(C) = C
> CMODE =  0    op2(C) = I
> CMODE = -1    op2(C) = inv(C)

C : DOUBLE PRECISION array, dimension (N) [in]
> The vector C in the formula op(A) \* op2(C).

INFO : INTEGER [out]
> = 0:  Successful exit.
> i > 0:  The ith argument is invalid.

WORK : DOUBLE PRECISION array, dimension (5\*N). [out]
> Workspace.

IWORK : INTEGER array, dimension (N). [out]
> Workspace.
